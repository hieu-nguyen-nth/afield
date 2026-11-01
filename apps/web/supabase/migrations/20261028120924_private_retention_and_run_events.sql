-- Redacted application events survive short provider log retention.
create table public.run_events (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null,
 run_id uuid not null, stage text not null, status text not null,
 error_code text, created_at timestamptz not null default now(),
 foreign key(run_id,owner_id) references public.runs(id,owner_id) on delete cascade
);
create index run_events_owner_run on public.run_events(owner_id,run_id,created_at);
alter table public.run_events enable row level security;
revoke all on public.run_events from public,anon,authenticated;
grant select on public.run_events to authenticated;
grant all on public.run_events to service_role;
create policy owned_read on public.run_events for select to authenticated using(owner_id=(select auth.uid()) and (select private.admitted()));
create function private.record_run_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.stage is distinct from old.stage or new.status is distinct from old.status then
  insert into public.run_events(owner_id,run_id,stage,status,error_code) values(new.owner_id,new.id,new.stage,new.status,left(new.error->>'code',80));
 end if;
 return new;
end $$;
revoke all on function private.record_run_event() from public,anon,authenticated;
create trigger redacted_run_event after update on public.runs for each row execute function private.record_run_event();
create function public.retain_private_data() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.run_events where created_at<now()-interval '14 days';
 delete from public.documents d where d.retrieved_at<now()-interval '30 days' and not exists(select 1 from public.citations c where c.document_id=d.id);
 update public.runs set draft='{}' where status in ('completed','failed','skipped') and updated_at<now()-interval '30 days' and draft<>'{}'::jsonb;
 delete from private.usage where metric like '%:read' and period<to_char(now()-interval '14 days','YYYY-MM-DD');
 delete from private.usage where metric like '%:write' and period<to_char(now()-interval '14 days','YYYY-MM-DD');
 delete from private.usage where metric like '%:setup' and period<to_char(now()-interval '14 days','YYYY-MM-DD');
end $$;
revoke all on function public.retain_private_data() from public,anon,authenticated;
grant execute on function public.retain_private_data() to service_role;
