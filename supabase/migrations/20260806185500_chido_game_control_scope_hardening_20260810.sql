begin;

create or replace function private.assert_chido_game_write_allowed(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_allow_write boolean;
  v_kill_switch boolean;
  v_self_excluded_until timestamptz;
  v_kyc_status text;
  v_dob date;
  v_age_verified_at timestamptz;
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;

  select allow_write, kill_switch
    into v_allow_write, v_kill_switch
  from public.system_controls
  where project_id = 'chido-casino'
    and id = 'chido-casino-games';

  if not found then raise exception 'GAME_CONTROL_MISSING'; end if;
  if coalesce(v_kill_switch, true) or not coalesce(v_allow_write, false) then
    raise exception 'GAMES_PAUSED';
  end if;

  select self_excluded_until,
         lower(coalesce(kyc_status, '')),
         date_of_birth,
         age_verified_at
    into v_self_excluded_until, v_kyc_status, v_dob, v_age_verified_at
  from public.profiles
  where user_id = p_user_id;

  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_kyc_status <> 'approved' then raise exception 'KYC_REQUIRED'; end if;
  if v_age_verified_at is null
     or v_dob is null
     or v_dob > (current_date - interval '18 years')::date then
    raise exception 'AGE_VERIFICATION_REQUIRED';
  end if;
  if v_self_excluded_until is not null and v_self_excluded_until > now() then
    raise exception 'SELF_EXCLUDED';
  end if;
end;
$$;

revoke all on function private.assert_chido_game_write_allowed(uuid)
  from public, anon, authenticated;
grant execute on function private.assert_chido_game_write_allowed(uuid)
  to service_role;

commit;
