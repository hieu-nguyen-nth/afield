-- No data is public. Browser roles can read owned rows but cannot write execution state.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;
create table private.allowed_emails (email text primary key check (email=lower(email)));
create table private.usage (metric text not null, period text not null, used bigint not null default 0, primary key(metric,period));
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, timezone text not null default 'America/Los_Angeles', deleted_at timestamptz);
create function private.admitted() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join private.allowed_emails a on a.email=lower(u.email) where u.id=auth.uid() and u.email_confirmed_at is not null)
 and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.deleted_at is not null)
$$;
revoke all on function private.admitted() from public;
grant execute on function private.admitted() to authenticated,service_role;
create table public.topics (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null, config jsonb not null, status text not null default 'draft' check(status in ('draft','active','paused')),
 confirmed boolean not null default false, pause_reason text, origin_brief_id uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,owner_id)
);
create table public.sources (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null, topic_id uuid not null,
 config jsonb not null, created_at timestamptz not null default now(), unique(id,owner_id,topic_id),
 foreign key(topic_id,owner_id) references public.topics(id,owner_id) on delete cascade
);
create table public.templates (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null, topic_id uuid not null,
 name text not null, config jsonb not null, version integer not null default 1, unique(id,owner_id,topic_id),
 foreign key(topic_id,owner_id) references public.topics(id,owner_id) on delete cascade
);
create table public.schedules (
 topic_id uuid primary key, owner_id uuid not null, config jsonb not null, next_at timestamptz, checkpoint timestamptz,
 foreign key(topic_id,owner_id) references public.topics(id,owner_id) on delete cascade
);
create table public.runs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 topic_id uuid, intent text not null check(intent in ('explore','update')), trigger text not null check(trigger in ('manual','scheduled')),
 request_key text not null check(length(request_key) between 8 and 200), request_hash text not null,
 snapshot jsonb not null, status text not null default 'queued' check(status in ('queued','running','completed','failed','skipped')),
 stage text not null default 'queued', error jsonb, draft jsonb not null default '{}',
 lease_token uuid, lease_until timestamptz, next_eligible_at timestamptz, attempts integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check ((intent='explore' and topic_id is null and trigger='manual') or (intent='update' and topic_id is not null)),
 foreign key(topic_id,owner_id) references public.topics(id,owner_id), unique(owner_id,intent,request_key), unique(id,owner_id)
);
create table public.outbox (run_id uuid primary key references public.runs(id) on delete cascade, dispatched_at timestamptz, attempts integer not null default 0);
create table public.source_checks (
 id uuid primary key default gen_random_uuid(), run_id uuid not null, owner_id uuid not null, scope text not null,
 outcome text not null check(outcome in ('success','empty','blocked','failed')), document_count integer not null, reason text, checked_at timestamptz not null default now(),
 foreign key(run_id,owner_id) references public.runs(id,owner_id) on delete cascade
);
create table public.documents (
 id uuid primary key, run_id uuid not null, owner_id uuid not null, url text not null, title text not null, publisher text not null,
 published_at timestamptz, retrieved_at timestamptz not null default now(), content_hash text not null, text text not null,
 origin text not null check(origin in ('followed','discovered')), unique(id,owner_id,run_id),
 foreign key(run_id,owner_id) references public.runs(id,owner_id) on delete cascade
);
create table public.audio_assets (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null, run_id uuid not null, text_hash text not null,
 voice jsonb not null, storage_path text not null unique, duration double precision not null check(duration>0), byte_size bigint not null check(byte_size>0),
 status text not null check(status in ('processing','ready','failed')), attempt integer not null, error text,
 created_at timestamptz not null default now(), unique(id,owner_id,run_id,text_hash),
 foreign key(run_id,owner_id) references public.runs(id,owner_id) on delete cascade
);
create table public.briefs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null, run_id uuid not null unique, topic_id uuid,
 intent text not null check(intent in ('explore','update')), title text not null, content jsonb not null, canonical_text text not null,
 text_hash text not null, word_count integer not null, snapshot jsonb not null, citations jsonb not null,
 budget_status text not null check(budget_status in ('met','unverified','not_met')), audio_status text not null check(audio_status in ('pending','processing','ready','failed')),
 audio_error text, selected_audio_id uuid, partial boolean not null default false, created_at timestamptz not null default now(),
 foreign key(run_id,owner_id) references public.runs(id,owner_id) on delete cascade,
 foreign key(topic_id,owner_id) references public.topics(id,owner_id),
 foreign key(selected_audio_id,owner_id,run_id,text_hash) references public.audio_assets(id,owner_id,run_id,text_hash),
 unique(id,owner_id), check((intent='explore' and topic_id is null) or (intent='update' and topic_id is not null))
);
alter table public.topics add foreign key(origin_brief_id,owner_id) references public.briefs(id,owner_id);
create table public.brief_items (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null, brief_id uuid not null, run_id uuid not null, position integer not null, item jsonb not null,
 unique(id,owner_id,run_id), foreign key(brief_id,owner_id) references public.briefs(id,owner_id) on delete cascade,
 foreign key(run_id,owner_id) references public.runs(id,owner_id) on delete cascade
);
create table public.citations (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null, run_id uuid not null, item_id uuid not null, document_id uuid not null,
 foreign key(item_id,owner_id,run_id) references public.brief_items(id,owner_id,run_id) on delete cascade,
 foreign key(document_id,owner_id,run_id) references public.documents(id,owner_id,run_id)
);
create table public.events (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null, topic_id uuid not null, brief_id uuid not null,
 event_key text not null, summary text not null, created_at timestamptz not null default now(),
 foreign key(topic_id,owner_id) references public.topics(id,owner_id), foreign key(brief_id,owner_id) references public.briefs(id,owner_id) on delete cascade
);
create table public.review_records (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null, brief_id uuid not null, usefulness integer check(usefulness between 1 and 5), notes text, created_at timestamptz not null default now(),
 foreign key(brief_id,owner_id) references public.briefs(id,owner_id) on delete cascade
);
create index on public.topics(owner_id,created_at desc);
create index on public.runs(owner_id,created_at desc,id desc);
create index on public.runs(status,next_eligible_at,lease_until);
create index on public.briefs(owner_id,created_at desc,id desc);
create index on public.briefs(topic_id,created_at desc);
create index on public.schedules(next_at);
create index on public.documents(run_id);
create index on public.source_checks(run_id);
create index on public.events(topic_id,created_at desc);
create index on public.audio_assets(run_id,created_at desc);

do $$ declare n text; begin
 for n in select unnest(array['topics','sources','templates','schedules','runs','source_checks','documents','audio_assets','briefs','brief_items','citations','events','review_records']) loop
  execute format('alter table public.%I enable row level security',n);
  execute format('revoke all on public.%I from anon, authenticated',n);
  execute format('grant select on public.%I to authenticated',n);
  execute format('create policy owned_read on public.%I for select to authenticated using (owner_id=(select auth.uid()) and (select private.admitted()))',n);
 end loop;
end $$;
alter table public.profiles enable row level security;
create policy owned_read on public.profiles for select to authenticated using(id=(select auth.uid()) and (select private.admitted()));
grant select on public.profiles to authenticated;
alter table public.outbox enable row level security;
revoke all on public.outbox from anon,authenticated;
grant all on all tables in schema public to service_role;

create function private.require_user() returns uuid language plpgsql security definer set search_path='' as $$
begin if not private.admitted() then raise exception 'not_authorized'; end if; return auth.uid(); end $$;
create function private.owner_admitted(p_owner uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join private.allowed_emails a on a.email=lower(u.email) where u.id=p_owner and u.email_confirmed_at is not null) and not exists(select 1 from public.profiles where id=p_owner and deleted_at is not null)
$$;
revoke all on function private.owner_admitted(uuid) from public,anon,authenticated;
create function private.take(p_metric text,p_period text,p_amount bigint,p_limit bigint) returns void language plpgsql security definer set search_path='' as $$
declare n bigint; begin
 if p_amount<0 then raise exception 'validation_failed'; end if;
 insert into private.usage values(p_metric,p_period,p_amount) on conflict(metric,period) do update set used=private.usage.used+excluded.used returning used into n;
 if n>p_limit then raise exception 'quota_exceeded'; end if;
end $$;
create function public.rate_limit(p_kind text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); begin
 if p_kind not in ('read','write','setup') then raise exception 'validation_failed'; end if;
 perform private.take(u||':'||p_kind,to_char(now() at time zone 'UTC','YYYY-MM-DD-HH24:MI'),1,case when p_kind='read' then 60 when p_kind='setup' then 5 else 15 end);
end $$;
create function public.save_topic(p_id uuid,p_config jsonb,p_origin uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); t uuid:=coalesce(p_id,gen_random_uuid()); src jsonb; tmpl jsonb; rid uuid; block text; idx integer; begin
 if length(p_config::text)>100000 or length(trim(p_config->>'name')) not between 1 and 120 or jsonb_typeof(p_config->'sources')<>'array' or jsonb_typeof(p_config->'templates')<>'array' or jsonb_array_length(p_config->'templates')<1 then raise exception 'validation_failed'; end if;
 if p_id is not null and not exists(select 1 from public.topics where id=p_id and owner_id=u) then raise exception 'not_authorized'; end if;
 if p_origin is not null and not exists(select 1 from public.briefs where id=p_origin and owner_id=u and intent='explore') then raise exception 'not_authorized'; end if;
 if p_id is null and (select count(*) from public.topics where owner_id=u)>=10 then raise exception 'quota_exceeded'; end if;
 insert into public.topics(id,owner_id,name,config,origin_brief_id) values(t,u,p_config->>'name',p_config,p_origin)
 on conflict(id) do update set name=excluded.name,config=excluded.config,updated_at=now();
 insert into public.schedules(topic_id,owner_id,config) values(t,u,p_config->'schedule') on conflict(topic_id) do update set next_at=case when public.schedules.config is distinct from excluded.config then null else public.schedules.next_at end,config=excluded.config;
 for src in select value from jsonb_array_elements(p_config->'sources') loop
  rid=coalesce((src->>'id')::uuid,gen_random_uuid());
  if exists(select 1 from public.sources where id=rid and (owner_id<>u or topic_id<>t)) then raise exception 'not_authorized'; end if;
  insert into public.sources(id,owner_id,topic_id,config) values(rid,u,t,src) on conflict(id) do update set config=excluded.config;
 end loop;
 for tmpl in select value from jsonb_array_elements(p_config->'templates') loop
  rid=coalesce((tmpl->>'id')::uuid,gen_random_uuid());
  if exists(select 1 from public.templates where id=rid and (owner_id<>u or topic_id<>t)) then raise exception 'not_authorized'; end if;
  if not exists(select 1 from jsonb_array_elements_text(tmpl->'blocks') b where b<>'Sources') then raise exception 'configuration_invalid'; end if;
  insert into public.templates(id,owner_id,topic_id,name,config) values(rid,u,t,tmpl->>'name',tmpl) on conflict(id) do update set name=excluded.name,config=excluded.config,version=public.templates.version+1;
  delete from public.template_blocks where template_id=rid;
  idx=0;for block in select jsonb_array_elements_text(tmpl->'blocks') loop
   insert into public.template_blocks(owner_id,topic_id,template_id,position,block_type) values(u,t,rid,idx,block);idx=idx+1;
  end loop;
 end loop;
 delete from public.subtopics where topic_id=t;
 idx=0;for block in select jsonb_array_elements_text(p_config->'subtopics') loop
  insert into public.subtopics(owner_id,topic_id,name,position) values(u,t,block,idx);idx=idx+1;
 end loop;
 if not exists(select 1 from jsonb_array_elements(p_config->'sources') s where s->>'status'='approved') then
  update public.topics set status=case when confirmed then 'paused' else 'draft' end,pause_reason='Approve at least one accessible source, then explicitly resume.' where id=t;
 end if;
 return t;
end $$;
create function public.topic_action(p_id uuid,p_action text,p_next timestamptz default null) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); t public.topics; begin
 select * into t from public.topics where id=p_id and owner_id=u for update;
 if not found then raise exception 'not_authorized'; end if;
 if p_action='pause' then update public.topics set status='paused',pause_reason='Paused by you.' where id=p_id; return; end if;
 if p_action not in ('activate','resume') or p_next is null or p_next<=now() then raise exception 'configuration_invalid'; end if;
 if p_action='resume' and not t.confirmed then raise exception 'configuration_invalid'; end if;
 if not exists(select 1 from jsonb_array_elements(t.config->'sources') s where s->>'status'='approved') then raise exception 'configuration_invalid'; end if;
 if (select count(*) from public.topics where owner_id=u and status='active' and id<>p_id)>=3 then raise exception 'quota_exceeded'; end if;
 update public.topics set status='active',confirmed=true,pause_reason=null where id=p_id;
 update public.schedules set next_at=p_next where topic_id=p_id;
end $$;
create function public.accept_run(p_intent text,p_topic uuid,p_input jsonb,p_key text,p_hash text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); existing public.runs; t public.topics; s jsonb; r uuid; begin
 perform pg_advisory_xact_lock(912047);
 select * into existing from public.runs where owner_id=u and intent=p_intent and request_key=p_key;
 if found then if existing.request_hash<>p_hash then raise exception 'idempotency_conflict'; end if; return existing.id; end if;
 if length(p_key) not between 8 and 200 then raise exception 'validation_failed'; end if;
 if p_intent='explore' and p_topic is null then
  if length(trim(p_input->>'prompt')) not between 1 and 4000 then raise exception 'validation_failed'; end if;
  s=p_input;
 elsif p_intent='update' and p_topic is not null then
  select * into t from public.topics where id=p_topic and owner_id=u;
  if not found or not t.confirmed then raise exception 'configuration_invalid'; end if;
  if not exists(select 1 from jsonb_array_elements(t.config->'sources') x where x->>'status'='approved') then raise exception 'configuration_invalid'; end if;
  s=jsonb_build_object('prompt',t.name,'preferences',t.config->>'preferences','depth',t.config->>'depth','topic',t.config,'limit',t.config->'templates'->((t.config->>'activeTemplateIndex')::integer)->'limit','coverageStart',now()-case when t.config->'schedule'->>'cadence'='daily' then interval '1 day' else interval '7 days' end,'coverageEnd',now());
 else raise exception 'validation_failed'; end if;
 if not ((s->'limit'->>'type'='words' and (s->'limit'->>'value')::integer in (400,800,1400)) or (s->'limit'->>'type'='duration' and (s->'limit'->>'value')::integer between 60 and 900 and (s->'limit'->>'value')::integer%60=0)) then raise exception 'validation_failed'; end if;
 perform private.take('runs',to_char(now() at time zone 'UTC','YYYY-MM'),1,30);
 perform private.take('runs',to_char(now() at time zone 'UTC','YYYY-MM-DD'),1,3);
 s=s||jsonb_build_object('asOf',now(),'profile','personal_free','version',1,'models',jsonb_build_object('text','gemini-3.8-flash','speech','gemini-3.8-flash-tts','voice','Kore'));
 insert into public.runs(owner_id,topic_id,intent,trigger,request_key,request_hash,snapshot) values(u,p_topic,p_intent,'manual',p_key,p_hash,s) returning id into r;
 insert into public.outbox(run_id) values(r); return r;
end $$;
create function public.retry_run(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); begin
 if exists(select 1 from public.briefs where run_id=p_id) then raise exception 'configuration_invalid'; end if;
 update public.runs set status='queued',error=null,next_eligible_at=null where id=p_id and owner_id=u and status='failed' and attempts<3;
 if not found then raise exception 'configuration_invalid'; end if;
 insert into public.outbox(run_id) values(p_id) on conflict(run_id) do update set dispatched_at=null;
end $$;
create function public.claim_run(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.runs; begin
 perform pg_advisory_xact_lock(912048);
 select * into r from public.runs where id=p_id for update;
 if not found or r.status not in ('queued','running') or r.lease_until>now() or r.next_eligible_at>now() then return null; end if;
 if not private.owner_admitted(r.owner_id) then return null; end if;
 if r.attempts>=3 then update public.runs set status=case when exists(select 1 from public.briefs where run_id=p_id) then 'completed' else 'failed' end,stage='interrupted',error=jsonb_build_object('code','generation_failed','message','The interrupted run reached its retry allowance.'),lease_token=null,lease_until=null where id=p_id; return null; end if;
 if r.trigger='scheduled' and r.status='queued' and not exists(select 1 from public.topics where id=r.topic_id and status='active') then update public.runs set status='skipped' where id=p_id; return null; end if;
 if exists(select 1 from public.runs where id<>p_id and lease_until>now() and status='running') or exists(select 1 from public.audio_jobs where status='running' and lease_until>now()) then return null; end if;
 update public.runs set status='running',lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=attempts+1,updated_at=now() where id=p_id returning * into r;
 return to_jsonb(r);
end $$;
create function public.checkpoint(p_id uuid,p_token uuid,p_stage text,p_draft jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.runs set stage=p_stage,draft=p_draft,lease_until=now()+interval '2 minutes',updated_at=now() where id=p_id and lease_token=p_token and lease_until>now() and status='running' and private.owner_admitted(owner_id);
 if not found then raise exception 'stale_lease'; end if;
end $$;
create function public.reserve_usage(p_metric text,p_amount bigint) returns void language plpgsql security definer set search_path='' as $$
begin
 case p_metric
 when 'tavily' then perform private.take('tavily',to_char(now() at time zone 'UTC','YYYY-MM'),p_amount,500);
 when 'text' then perform private.take('text',to_char(now() at time zone 'UTC','YYYY-MM-DD'),p_amount,40);
 when 'speech' then perform private.take('speech',to_char(now() at time zone 'UTC','YYYY-MM-DD'),p_amount,12);
 when 'storage' then perform private.take('storage','retained',p_amount,700000000);
 else raise exception 'validation_failed'; end case;
end $$;
create function public.finish_run(p_id uuid,p_token uuid,p_error jsonb default null,p_wait timestamptz default null) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.runs set status=case when p_wait is not null then 'running' when exists(select 1 from public.briefs where run_id=p_id) then 'completed' when p_error is not null then 'failed' else 'completed' end,
 error=p_error,next_eligible_at=p_wait,stage=case when p_wait is not null then 'waiting_for_quota' when p_error is null then 'completed' else 'failed' end,lease_token=null,lease_until=null,updated_at=now()
 where id=p_id and lease_token=p_token and status='running';
 if not found then raise exception 'stale_lease'; end if;
end $$;
create function public.publish_brief(p_id uuid,p_token uuid,p_content jsonb,p_text text,p_hash text,p_words integer,p_budget text,p_partial boolean,p_audio uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
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
 values(r.owner_id,p_id,r.topic_id,r.intent,p_content->>'title',p_content,p_text,p_hash,p_words,r.snapshot,refs,p_budget,case when p_audio is null then 'pending' else 'ready' end,p_audio,p_partial) returning id into b;
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
create function public.attach_audio(p_brief uuid,p_audio uuid,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
declare b public.briefs; a public.audio_assets; begin
 select * into b from public.briefs where id=p_brief and private.owner_admitted(owner_id) for update; if not found then raise exception 'not_authorized'; end if;
 if p_audio is null then update public.briefs set audio_status='failed',audio_error=left(p_error,300) where id=p_brief and selected_audio_id is null; return; end if;
 select * into a from public.audio_assets where id=p_audio and run_id=b.run_id and owner_id=b.owner_id and text_hash=b.text_hash and status='ready';
 if not found or (b.snapshot->'limit'->>'type'='duration' and a.duration>(b.snapshot->'limit'->>'value')::integer) then raise exception 'budget_not_met'; end if;
 update public.briefs set selected_audio_id=p_audio,audio_status='ready',audio_error=null,budget_status='met' where id=p_brief;
end $$;
create function public.protect_brief() returns trigger language plpgsql set search_path='' as $$
begin
 if (to_jsonb(new)-array['selected_audio_id','audio_status','audio_error','budget_status']) is distinct from (to_jsonb(old)-array['selected_audio_id','audio_status','audio_error','budget_status']) then raise exception 'published_content_immutable'; end if;
 return new;
end $$;
create trigger immutable_brief before update on public.briefs for each row execute function public.protect_brief();

-- Explicit function privileges: no default PUBLIC/anon execution of privileged commands.
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.admitted() to authenticated,service_role;
revoke all on all functions in schema public from public,anon,authenticated;
grant execute on function public.rate_limit(text),public.save_topic(uuid,jsonb,uuid),public.topic_action(uuid,text,timestamptz),public.accept_run(text,uuid,jsonb,text,text),public.retry_run(uuid) to authenticated;
grant execute on all functions in schema public to service_role;
grant all on all tables in schema private to service_role;

-- Audio objects cannot be enumerated/read by browser roles, even when their path is known.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('brief-audio','brief-audio',false,15000000,array['audio/mpeg']) on conflict(id) do nothing;

-- Drafts, lease fencing tokens and private storage paths are never client-readable.
revoke select on public.runs,public.audio_assets from authenticated;
grant select(id,owner_id,topic_id,intent,trigger,request_key,snapshot,status,stage,error,next_eligible_at,attempts,created_at,updated_at) on public.runs to authenticated;
create function public.schedule_occurrence(p_topic uuid,p_expected timestamptz,p_next timestamptz,p_key text) returns uuid language plpgsql security definer set search_path='' as $$
declare t public.topics; sc public.schedules; s jsonb; r uuid; begin
 perform pg_advisory_xact_lock(912047);
 select * into t from public.topics where id=p_topic and status='active' for update;
 if not found then return null; end if;
 select * into sc from public.schedules where topic_id=p_topic for update;
 if sc.next_at is distinct from p_expected or sc.next_at>now() or p_next<=now() then return null; end if;
 if exists(select 1 from public.runs where topic_id=p_topic and trigger='scheduled' and status in ('queued','running')) then return null; end if;
 select id into r from public.runs where owner_id=t.owner_id and intent='update' and request_key=p_key;
 if found then update public.schedules set next_at=p_next where topic_id=p_topic; return r; end if;
 if not exists(select 1 from jsonb_array_elements(t.config->'sources') x where x->>'status'='approved') then update public.topics set status='paused',pause_reason='Approve a source and explicitly resume.' where id=p_topic; return null; end if;
 perform private.take('runs',to_char(now() at time zone 'UTC','YYYY-MM'),1,30);
 perform private.take('runs',to_char(now() at time zone 'UTC','YYYY-MM-DD'),1,3);
 s=jsonb_build_object('prompt',t.name,'preferences',t.config->>'preferences','depth',t.config->>'depth','topic',t.config,'limit',t.config->'templates'->((t.config->>'activeTemplateIndex')::integer)->'limit','asOf',now(),'coverageStart',greatest(coalesce(sc.checkpoint,now()-case when sc.config->>'cadence'='daily' then interval '1 day' else interval '7 days' end),now()-interval '30 days'),'coverageEnd',now(),'profile','personal_free','version',1,'uncoveredBefore',case when sc.checkpoint<now()-interval '30 days' then now()-interval '30 days' else null end,'models',jsonb_build_object('text','gemini-3.8-flash','speech','gemini-3.8-flash-tts','voice','Kore'));
 insert into public.runs(owner_id,topic_id,intent,trigger,request_key,request_hash,snapshot) values(t.owner_id,p_topic,'update','scheduled',p_key,p_key,s) returning id into r;
 insert into public.outbox(run_id) values(r);
 update public.schedules set next_at=p_next where topic_id=p_topic;
 return r;
end $$;
revoke all on function public.schedule_occurrence(uuid,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.schedule_occurrence(uuid,timestamptz,timestamptz,text) to service_role;

create function public.get_usage() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); begin return jsonb_build_object('runs',coalesce((select used from private.usage where metric='runs' and period=to_char(now() at time zone 'UTC','YYYY-MM')),0),'limit',30); end $$;
revoke all on function public.get_usage() from public,anon;
grant execute on function public.get_usage() to authenticated;

create function public.save_review(p_brief uuid,p_score integer,p_notes text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); begin
 if p_score not between 1 and 5 or length(p_notes)>4000 or not exists(select 1 from public.briefs where id=p_brief and owner_id=u) then raise exception 'validation_failed'; end if;
 insert into public.review_records(owner_id,brief_id,usefulness,notes) values(u,p_brief,p_score,p_notes);
end $$;
revoke all on function public.save_review(uuid,integer,text) from public,anon;
grant execute on function public.save_review(uuid,integer,text) to authenticated;

create table public.audio_jobs(id uuid primary key default gen_random_uuid(),owner_id uuid not null,brief_id uuid not null,status text not null default 'queued' check(status in ('queued','running','completed','failed')),lease_token uuid,lease_until timestamptz,created_at timestamptz not null default now(),foreign key(brief_id,owner_id) references public.briefs(id,owner_id) on delete cascade);
create unique index one_audio_job on public.audio_jobs(brief_id) where status in ('queued','running');
alter table public.audio_jobs enable row level security;
revoke all on public.audio_jobs from public,anon,authenticated;
grant all on public.audio_jobs to service_role;
create function public.request_audio_retry(p_brief uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); job uuid; begin
 if not exists(select 1 from public.briefs where id=p_brief and owner_id=u and selected_audio_id is null) then raise exception 'configuration_invalid'; end if;
 select id into job from public.audio_jobs where brief_id=p_brief and status in ('queued','running'); if found then return job; end if;
 perform private.take('audio_retry:'||p_brief,to_char(now() at time zone 'UTC','YYYY-MM-DD'),1,2);
 insert into public.audio_jobs(owner_id,brief_id) values(u,p_brief) returning id into job; return job;
end $$;
create function public.claim_audio(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.audio_jobs; begin
 perform pg_advisory_xact_lock(912048);
 if exists(select 1 from public.runs where status='running' and lease_until>now()) or exists(select 1 from public.audio_jobs where status='running' and lease_until>now()) then return null; end if;
 select * into j from public.audio_jobs where id=p_id and status in ('queued','running') and (lease_until is null or lease_until<=now()) for update; if not found then return null; end if;
 if not private.owner_admitted(j.owner_id) then return null; end if;
 update public.audio_jobs set status='running',lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes' where id=p_id returning * into j;return to_jsonb(j);
end $$;
create function public.touch_audio(p_id uuid,p_token uuid,p_done boolean) returns void language plpgsql security definer set search_path='' as $$
begin update public.audio_jobs set status=case when p_done then 'completed' else 'running' end,lease_until=case when p_done then null else now()+interval '2 minutes' end where id=p_id and lease_token=p_token and lease_until>now() and private.owner_admitted(owner_id); if not found then raise exception 'stale_lease'; end if; end $$;
revoke all on function public.request_audio_retry(uuid),public.claim_audio(uuid),public.touch_audio(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.request_audio_retry(uuid) to authenticated;
grant execute on function public.claim_audio(uuid),public.touch_audio(uuid,uuid,boolean) to service_role;
create function public.request_deletion() returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); begin insert into public.profiles(id,deleted_at) values(u,now()) on conflict(id) do update set deleted_at=now();update public.topics set status='paused',pause_reason='Account deletion requested.' where owner_id=u; end $$;
revoke all on function public.request_deletion() from public,anon;
grant execute on function public.request_deletion() to authenticated;
alter table private.allowed_emails enable row level security;
alter table private.usage enable row level security;

create table public.subtopics(id uuid primary key default gen_random_uuid(),owner_id uuid not null,topic_id uuid not null,name text not null,position integer not null,foreign key(topic_id,owner_id) references public.topics(id,owner_id) on delete cascade);
create table public.template_blocks(id uuid primary key default gen_random_uuid(),owner_id uuid not null,topic_id uuid not null,template_id uuid not null,position integer not null,block_type text not null,foreign key(template_id,owner_id,topic_id) references public.templates(id,owner_id,topic_id) on delete cascade);
alter table public.subtopics enable row level security;
alter table public.template_blocks enable row level security;
revoke all on public.subtopics,public.template_blocks from public,anon,authenticated;
grant select on public.subtopics,public.template_blocks to authenticated;
grant all on public.subtopics,public.template_blocks to service_role;
create policy owned_read on public.subtopics for select to authenticated using(owner_id=(select auth.uid()) and (select private.admitted()));
create policy owned_read on public.template_blocks for select to authenticated using(owner_id=(select auth.uid()) and (select private.admitted()));
create function public.orphan_audio() returns setof public.audio_assets language sql security definer set search_path='' as $$
 update public.audio_assets a set status='failed' where a.created_at<now()-interval '24 hours' and not exists(select 1 from public.briefs b where b.selected_audio_id=a.id) returning a.*
$$;
create function public.release_audio(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare n bigint; begin delete from public.audio_assets a where a.id=p_id and not exists(select 1 from public.briefs b where b.selected_audio_id=a.id) returning byte_size into n;
 if n is not null then update private.usage set used=greatest(0,used-n) where metric='storage' and period='retained'; end if; end $$;
revoke all on function public.orphan_audio(),public.release_audio(uuid) from public,anon,authenticated;
grant execute on function public.orphan_audio(),public.release_audio(uuid) to service_role;
