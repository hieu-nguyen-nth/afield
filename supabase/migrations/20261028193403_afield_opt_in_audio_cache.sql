-- User approval is separate from text acceptance; no rows are publicly writable.
alter table public.briefs drop constraint briefs_audio_status_check;
alter table public.briefs add constraint briefs_audio_status_check check(audio_status in ('not_requested','pending','processing','ready','failed'));
alter table public.audio_assets add column profile_key text not null default 'legacy';
alter table public.audio_assets drop constraint audio_assets_storage_path_key;
create index audio_asset_object_refs on public.audio_assets(storage_path);
create index audio_asset_cache on public.audio_assets(owner_id,text_hash,profile_key) where status='ready';
alter table public.audio_jobs add column attempts integer not null default 0;
update public.briefs b set audio_status='not_requested' where selected_audio_id is null and audio_status='pending' and not exists(select 1 from public.audio_jobs j where j.brief_id=b.id and j.status in ('queued','running'));
create or replace function public.publish_brief(p_id uuid,p_token uuid,p_content jsonb,p_text text,p_hash text,p_words integer,p_budget text,p_partial boolean,p_audio uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.runs; b uuid; it jsonb; d text; itemid uuid; pos integer:=0; refs jsonb; begin
 select * into r from public.runs where id=p_id and lease_token=p_token and lease_until>now() and status='running' and private.owner_admitted(owner_id) for update;
 if not found then raise exception 'stale_lease'; end if;
 select id into b from public.briefs where run_id=p_id; if found then return b; end if;
 if p_hash<>encode(sha256(convert_to(p_text,'UTF8')),'hex') then raise exception 'evidence_validation_failed'; end if;
 if r.snapshot->'limit'->>'type'='words' and p_words>(r.snapshot->'limit'->>'value')::integer then raise exception 'budget_not_met'; end if;
 if p_audio is not null and not exists(select 1 from public.audio_assets where id=p_audio and run_id=p_id and owner_id=r.owner_id and text_hash=p_hash and status='ready' and (r.snapshot->'limit'->>'type'='words' or duration<=(r.snapshot->'limit'->>'value')::integer)) then raise exception 'budget_not_met'; end if;
 if r.snapshot->'limit'->>'type'='duration' and p_budget='met' and p_audio is null then raise exception 'budget_not_met'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'url',url,'title',title,'publisher',publisher,'publishedAt',published_at,'origin',origin)),'[]') into refs from public.documents where run_id=p_id and id::text in (select jsonb_array_elements_text(ci.value->'citationIds') from jsonb_array_elements(p_content->'blocks') cb cross join lateral jsonb_array_elements(cb.value->'items') ci);
 insert into public.briefs(owner_id,run_id,topic_id,intent,title,content,canonical_text,text_hash,word_count,snapshot,citations,budget_status,audio_status,selected_audio_id,partial)
 values(r.owner_id,p_id,r.topic_id,r.intent,p_content->>'title',p_content,p_text,p_hash,p_words,r.snapshot,refs,p_budget,case when p_audio is null then 'not_requested' else 'ready' end,p_audio,p_partial) returning id into b;
 for it in select item.value from jsonb_array_elements(p_content->'blocks') as bl(value) cross join lateral jsonb_array_elements(bl.value->'items') as item(value) loop
  pos=pos+1;
  insert into public.brief_items(owner_id,brief_id,run_id,position,item) values(r.owner_id,b,p_id,pos,it) returning id into itemid;
  if jsonb_array_length(it->'citationIds')=0 then raise exception 'evidence_validation_failed'; end if;
  for d in select jsonb_array_elements_text(it->'citationIds') loop
   insert into public.citations(owner_id,run_id,item_id,document_id) values(r.owner_id,p_id,itemid,d::uuid);
  end loop;
  if r.topic_id is not null and it->>'eventKey' is not null then insert into public.events(owner_id,topic_id,brief_id,event_key,summary) values(r.owner_id,r.topic_id,b,it->>'eventKey',it->>'text'); end if;
 end loop;
 if r.trigger='scheduled' then update public.schedules set checkpoint=greatest(checkpoint,(r.snapshot->>'coverageEnd')::timestamptz) where topic_id=r.topic_id; end if;
 return b;
end $$;

create function public.reuse_audio(p_brief uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare b public.briefs; a public.audio_assets; reused uuid; begin
 select * into b from public.briefs where id=p_brief and private.owner_admitted(owner_id) for update;
 if not found then raise exception 'not_authorized'; end if;
 if b.selected_audio_id is not null then return b.selected_audio_id; end if;
 select * into a from public.audio_assets where owner_id=b.owner_id and text_hash=b.text_hash and profile_key='gemini-3.8-flash-tts:Kore:mp3-mono-64k:equivalence-v1' and status='ready' order by created_at desc limit 1 for share;
 if not found then return null; end if;
 if b.snapshot->'limit'->>'type'='duration' and a.duration>(b.snapshot->'limit'->>'value')::integer then raise exception 'budget_not_met'; end if;
 if a.run_id=b.run_id then reused=a.id;
 else
  insert into public.audio_assets(owner_id,run_id,text_hash,voice,profile_key,storage_path,duration,byte_size,status,attempt)
  values(b.owner_id,b.run_id,b.text_hash,a.voice,a.profile_key,a.storage_path,a.duration,a.byte_size,'ready',0) returning id into reused;
 end if;
 perform public.attach_audio(b.id,reused,null); return reused;
end $$;
revoke all on function public.reuse_audio(uuid) from public,anon,authenticated;
grant execute on function public.reuse_audio(uuid) to service_role;
create function public.request_audio(p_brief uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); b public.briefs; job uuid; cached uuid; begin
 select * into b from public.briefs where id=p_brief and owner_id=u for update;
 if not found then raise exception 'not_authorized'; end if;
 cached=public.reuse_audio(p_brief);
 if cached is not null then return jsonb_build_object('cached',true,'queued',false); end if;
 select id into job from public.audio_jobs where brief_id=p_brief and status in ('queued','running');
 if found then return jsonb_build_object('cached',false,'queued',true,'jobId',job); end if;
 perform private.take('audio_retry:'||p_brief,to_char(now() at time zone 'UTC','YYYY-MM-DD'),1,2);
 insert into public.audio_jobs(owner_id,brief_id) values(u,p_brief) returning id into job;
 update public.briefs set audio_status='processing',audio_error=null where id=p_brief;
 return jsonb_build_object('cached',false,'queued',true,'jobId',job);
end $$;
revoke all on function public.request_audio(uuid) from public,anon;
grant execute on function public.request_audio(uuid) to authenticated;
-- Preserve the older API name with the same approval/cache boundary.
create or replace function public.request_audio_retry(p_brief uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin return (public.request_audio(p_brief)->>'jobId')::uuid; end $$;
create or replace function public.claim_audio(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.audio_jobs; begin
 perform pg_advisory_xact_lock(912048);
 if exists(select 1 from public.runs where status='running' and lease_until>now()) or exists(select 1 from public.audio_jobs where status='running' and lease_until>now()) then return null; end if;
 select * into j from public.audio_jobs where id=p_id and status in ('queued','running') and (lease_until is null or lease_until<=now()) for update;
 if not found or not private.owner_admitted(j.owner_id) then return null; end if;
 if j.attempts>=3 then
  update public.audio_jobs set status='failed' where id=p_id;
  update public.briefs set audio_status='failed',audio_error='Audio was interrupted repeatedly. Retry explicitly.' where id=j.brief_id and selected_audio_id is null;
  return null;
 end if;
 update public.audio_jobs set status='running',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes' where id=p_id returning * into j; return to_jsonb(j);
end $$;
create function public.can_remove_audio_object(p_id uuid) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from public.audio_assets a where a.id=p_id and a.status='failed' and not exists(select 1 from public.audio_assets other where other.storage_path=a.storage_path and other.id<>a.id) and not exists(select 1 from public.briefs b where b.selected_audio_id=a.id))
$$;
create or replace function public.release_audio(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare n bigint; path text; begin
 delete from public.audio_assets a where a.id=p_id and not exists(select 1 from public.briefs b where b.selected_audio_id=a.id) returning byte_size,storage_path into n,path;
 if n is not null and not exists(select 1 from public.audio_assets where storage_path=path) then update private.usage set used=greatest(0,used-n) where metric='storage' and period='retained'; end if;
end $$;
revoke all on function public.can_remove_audio_object(uuid) from public,anon,authenticated;
grant execute on function public.can_remove_audio_object(uuid) to service_role;
