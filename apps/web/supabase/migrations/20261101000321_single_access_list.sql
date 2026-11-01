-- Pre-authentication lookup for the trusted app server only.
-- Browser roles cannot enumerate or query the private access list.
create function public.is_email_allowed(p_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.allowed_emails where email = lower(trim(p_email))
  );
$$;
revoke all on function public.is_email_allowed(text) from public, anon, authenticated;
grant execute on function public.is_email_allowed(text) to service_role;
