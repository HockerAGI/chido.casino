begin;

create or replace function public.reset_rate_limit(p_key text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if nullif(btrim(p_key), '') is null then
    raise exception 'RATE_LIMIT_KEY_REQUIRED';
  end if;
  delete from public.security_rate_limits where key = p_key;
  return true;
end;
$$;

revoke all on function public.reset_rate_limit(text)
  from public, anon, authenticated;
grant execute on function public.reset_rate_limit(text)
  to service_role;

comment on function public.reset_rate_limit(text) is
  'Clears a server-derived rate-limit key after the server verifies a successful authenticated login.';

commit;