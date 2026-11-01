-- Store source choice per run; manual overrides never mutate topic configuration.
create or replace function public.accept_run(p_intent text,p_topic uuid,p_input jsonb,p_key text,p_hash text) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); existing public.runs; t public.topics; s jsonb; r uuid; begin
 perform pg_advisory_xact_lock(912047);
 select * into existing from public.runs where owner_id=u and intent=p_intent and request_key=p_key;
 if found then if existing.request_hash<>p_hash then raise exception 'idempotency_conflict'; end if; return existing.id; end if;
 if length(p_key) not between 8 and 200 then raise exception 'validation_failed'; end if;
 if p_intent='explore' and p_topic is null then
  if length(trim(p_input->>'prompt')) not between 1 and 4000 then raise exception 'validation_failed'; end if;
  s=p_input||jsonb_build_object('sourceMode',coalesce(p_input->>'sourceMode','sources_only'));
 elsif p_intent='update' and p_topic is not null then
  select * into t from public.topics where id=p_topic and owner_id=u;
  if not found or not t.confirmed then raise exception 'configuration_invalid'; end if;
  if not exists(select 1 from jsonb_array_elements(t.config->'sources') x where x->>'status'='approved') then raise exception 'configuration_invalid'; end if;
  s=jsonb_build_object('prompt',t.name,'preferences',t.config->>'preferences','depth',t.config->>'depth','topic',t.config,'limit',t.config->'templates'->((t.config->>'activeTemplateIndex')::integer)->'limit','sourceMode',coalesce(p_input->>'sourceMode',case when t.config->>'researchPolicy'='approved_plus_discovery' then 'sources_and_web' else 'sources_only' end),'coverageStart',now()-case when t.config->'schedule'->>'cadence'='daily' then interval '1 day' else interval '7 days' end,'coverageEnd',now());
 else raise exception 'validation_failed'; end if;
 if not ((s->'limit'->>'type'='words' and (s->'limit'->>'value')::integer in (400,800,1400)) or (s->'limit'->>'type'='duration' and (s->'limit'->>'value')::integer between 60 and 900 and (s->'limit'->>'value')::integer%60=0)) then raise exception 'validation_failed'; end if;
 if s->>'sourceMode' not in ('sources_only','web_only','sources_and_web') then raise exception 'validation_failed'; end if;
 perform private.take('runs',to_char(now() at time zone 'UTC','YYYY-MM'),1,30);
 perform private.take('runs',to_char(now() at time zone 'UTC','YYYY-MM-DD'),1,3);
 s=s||jsonb_build_object('asOf',now(),'profile','personal_free','version',1,'models',jsonb_build_object('text','gemini-3.8-flash','speech','gemini-3.8-flash-tts','voice','Kore'));
 insert into public.runs(owner_id,topic_id,intent,trigger,request_key,request_hash,snapshot) values(u,p_topic,p_intent,'manual',p_key,p_hash,s) returning id into r;
 insert into public.outbox(run_id) values(r); return r;
end $$;

create or replace function public.schedule_occurrence(p_topic uuid,p_expected timestamptz,p_next timestamptz,p_key text) returns uuid language plpgsql security definer set search_path='' as $$
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
 s=jsonb_build_object('prompt',t.name,'preferences',t.config->>'preferences','depth',t.config->>'depth','topic',t.config,'limit',t.config->'templates'->((t.config->>'activeTemplateIndex')::integer)->'limit','asOf',now(),'sourceMode',case when t.config->>'researchPolicy'='approved_plus_discovery' then 'sources_and_web' else 'sources_only' end,'coverageStart',greatest(coalesce(sc.checkpoint,now()-case when sc.config->>'cadence'='daily' then interval '1 day' else interval '7 days' end),now()-interval '30 days'),'coverageEnd',now(),'profile','personal_free','version',1,'uncoveredBefore',case when sc.checkpoint<now()-interval '30 days' then now()-interval '30 days' else null end,'models',jsonb_build_object('text','gemini-3.8-flash','speech','gemini-3.8-flash-tts','voice','Kore'));
 insert into public.runs(owner_id,topic_id,intent,trigger,request_key,request_hash,snapshot) values(t.owner_id,p_topic,'update','scheduled',p_key,p_key,s) returning id into r;
 insert into public.outbox(run_id) values(r);
 update public.schedules set next_at=p_next where topic_id=p_topic;
 return r;
end $$;
