begin;

alter table public.profiles
  add column if not exists date_of_birth date,
  add column if not exists age_declared_at timestamptz,
  add column if not exists age_verified_at timestamptz,
  add column if not exists age_verified_by text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz;

create or replace function private.enforce_verified_adult_profile()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  if new.age_verified_at is not null then
    if new.date_of_birth is null
       or new.date_of_birth > (current_date - interval '18 years')::date then
      raise exception 'AGE_VERIFICATION_INVALID';
    end if;
    if nullif(btrim(coalesce(new.age_verified_by, '')), '') is null then
      raise exception 'AGE_VERIFIER_REQUIRED';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_verified_adult_profile on public.profiles;
create trigger trg_enforce_verified_adult_profile
before insert or update of date_of_birth, age_verified_at, age_verified_by
on public.profiles
for each row execute function private.enforce_verified_adult_profile();

alter table public.kyc_requests
  add column if not exists reviewed_by text,
  add column if not exists decision_reason text,
  add column if not exists verified_date_of_birth date,
  add column if not exists document_hashes jsonb not null default '{}'::jsonb,
  add column if not exists storage_cleanup_status text not null default 'not_required';

alter table public.kyc_requests
  drop constraint if exists kyc_requests_status_allowed;
alter table public.kyc_requests
  add constraint kyc_requests_status_allowed
  check (status in ('uploading', 'pending', 'review_required', 'approved', 'rejected', 'failed')) not valid;
alter table public.kyc_requests validate constraint kyc_requests_status_allowed;

create unique index if not exists kyc_requests_one_open_per_user_uidx
  on public.kyc_requests(user_id)
  where status in ('uploading', 'pending', 'review_required');

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'kyc',
  'kyc',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'application/pdf']::text[]
)
on conflict(id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

create table if not exists public.security_rate_limits(
  key text primary key,
  window_started_at timestamptz not null,
  hits integer not null default 0 check (hits >= 0),
  updated_at timestamptz not null default now()
);

alter table public.security_rate_limits enable row level security;
revoke all on public.security_rate_limits from public, anon, authenticated;
grant all on public.security_rate_limits to service_role;

drop policy if exists security_rate_limits_service_all on public.security_rate_limits;
create policy security_rate_limits_service_all
  on public.security_rate_limits
  for all to service_role
  using (true)
  with check (true);

create or replace function public.consume_rate_limit(
  p_key text,
  p_max_hits integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.security_rate_limits%rowtype;
  v_now timestamptz := clock_timestamp();
  v_reset timestamptz;
  v_allowed boolean;
begin
  if nullif(btrim(p_key), '') is null then raise exception 'RATE_LIMIT_KEY_REQUIRED'; end if;
  if p_max_hits < 1 or p_max_hits > 10000 then raise exception 'RATE_LIMIT_MAX_INVALID'; end if;
  if p_window_seconds < 1 or p_window_seconds > 2592000 then raise exception 'RATE_LIMIT_WINDOW_INVALID'; end if;

  perform pg_advisory_xact_lock(hashtextextended('rate:' || p_key, 0));
  select * into v_row
  from public.security_rate_limits
  where key = p_key
  for update;

  if not found or v_row.window_started_at + make_interval(secs => p_window_seconds) <= v_now then
    insert into public.security_rate_limits(key, window_started_at, hits, updated_at)
    values(p_key, v_now, 1, v_now)
    on conflict(key) do update set
      window_started_at = excluded.window_started_at,
      hits = 1,
      updated_at = excluded.updated_at
    returning * into v_row;
    v_allowed := true;
  elsif v_row.hits < p_max_hits then
    update public.security_rate_limits
    set hits = hits + 1, updated_at = v_now
    where key = p_key
    returning * into v_row;
    v_allowed := true;
  else
    v_allowed := false;
  end if;

  v_reset := v_row.window_started_at + make_interval(secs => p_window_seconds);
  return jsonb_build_object(
    'ok', true,
    'allowed', v_allowed,
    'hits', v_row.hits,
    'remaining', greatest(p_max_hits - v_row.hits, 0),
    'reset_at', v_reset
  );
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer)
  to service_role;

create or replace function public.begin_kyc_request(
  p_user_id uuid,
  p_date_of_birth date
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;
  if p_date_of_birth is null
     or p_date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'ADULT_AGE_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('kyc:' || p_user_id::text, 0));
  if exists (
    select 1 from public.kyc_requests
    where user_id = p_user_id
      and status in ('uploading', 'pending', 'review_required')
  ) then
    raise exception 'KYC_REQUEST_ALREADY_OPEN';
  end if;
  if not exists(select 1 from public.profiles where user_id = p_user_id) then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  insert into public.kyc_requests(user_id, status, submitted_at, metadata)
  values(
    p_user_id,
    'uploading',
    now(),
    jsonb_build_object('version', 2, 'declared_date_of_birth', p_date_of_birth)
  )
  returning id into v_id;

  update public.profiles
  set date_of_birth = p_date_of_birth,
      age_declared_at = now(),
      kyc_status = 'pending',
      updated_at = now()
  where user_id = p_user_id;

  return v_id;
end;
$$;

create or replace function public.finalize_kyc_request(
  p_request_id uuid,
  p_user_id uuid,
  p_id_front_path text,
  p_id_back_path text,
  p_selfie_path text,
  p_document_hashes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if nullif(btrim(p_id_front_path), '') is null
     or nullif(btrim(p_id_back_path), '') is null
     or nullif(btrim(p_selfie_path), '') is null then
    raise exception 'KYC_DOCUMENTS_REQUIRED';
  end if;

  update public.kyc_requests
  set status = 'pending',
      id_front_path = p_id_front_path,
      id_back_path = p_id_back_path,
      selfie_path = p_selfie_path,
      document_hashes = coalesce(p_document_hashes, '{}'::jsonb),
      submitted_at = now(),
      updated_at = now()
  where id = p_request_id
    and user_id = p_user_id
    and status = 'uploading';

  if not found then raise exception 'KYC_REQUEST_NOT_UPLOADABLE'; end if;
  return jsonb_build_object('ok', true, 'request_id', p_request_id, 'status', 'pending');
end;
$$;

create or replace function public.fail_kyc_request(
  p_request_id uuid,
  p_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.kyc_requests
  set status = 'failed',
      decision_reason = left(coalesce(p_reason, 'UPLOAD_FAILED'), 500),
      storage_cleanup_status = 'attempted',
      updated_at = now()
  where id = p_request_id
    and user_id = p_user_id
    and status = 'uploading';
end;
$$;

create or replace function public.review_kyc_request(
  p_request_id uuid,
  p_admin_id text,
  p_decision text,
  p_reason text,
  p_verified_date_of_birth date
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.kyc_requests%rowtype;
  v_decision text := lower(btrim(coalesce(p_decision, '')));
begin
  if nullif(btrim(coalesce(p_admin_id, '')), '') is null then raise exception 'ADMIN_REQUIRED'; end if;
  if v_decision not in ('approved', 'rejected', 'review_required') then raise exception 'KYC_DECISION_INVALID'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'KYC_REASON_REQUIRED'; end if;

  select * into v_request
  from public.kyc_requests
  where id = p_request_id
  for update;

  if not found then raise exception 'KYC_REQUEST_NOT_FOUND'; end if;
  if v_request.status not in ('pending', 'review_required') then raise exception 'KYC_REQUEST_NOT_REVIEWABLE'; end if;
  if v_decision = 'approved' then
    if v_request.id_front_path is null
       or v_request.id_back_path is null
       or v_request.selfie_path is null
       or coalesce(jsonb_object_length(v_request.document_hashes), 0) < 3 then
      raise exception 'KYC_DOCUMENTS_INCOMPLETE';
    end if;
    if p_verified_date_of_birth is null
       or p_verified_date_of_birth > (current_date - interval '18 years')::date then
      raise exception 'VERIFIED_ADULT_REQUIRED';
    end if;
  end if;

  update public.kyc_requests
  set status = v_decision,
      reviewed_at = now(),
      reviewed_by = p_admin_id,
      review_note = p_reason,
      decision_reason = p_reason,
      verified_date_of_birth = p_verified_date_of_birth,
      updated_at = now()
  where id = p_request_id;

  update public.profiles
  set kyc_status = v_decision,
      date_of_birth = case when v_decision = 'approved' then p_verified_date_of_birth else date_of_birth end,
      age_verified_at = case when v_decision = 'approved' then now() else null end,
      age_verified_by = case when v_decision = 'approved' then p_admin_id else null end,
      updated_at = now()
  where user_id = v_request.user_id;

  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  insert into public.transactions_audit(
    transaction_id, changed_by, action, payload, created_at
  ) values (
    null,
    p_admin_id,
    'kyc_review',
    jsonb_build_object(
      'request_id', p_request_id,
      'user_id', v_request.user_id,
      'decision', v_decision,
      'reason', p_reason,
      'verified_date_of_birth', p_verified_date_of_birth
    ),
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'request_id', p_request_id,
    'user_id', v_request.user_id,
    'status', v_decision
  );
end;
$$;

revoke all on function public.begin_kyc_request(uuid, date)
  from public, anon, authenticated;
revoke all on function public.finalize_kyc_request(uuid, uuid, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.fail_kyc_request(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.review_kyc_request(uuid, text, text, text, date)
  from public, anon, authenticated;

grant execute on function public.begin_kyc_request(uuid, date)
  to service_role;
grant execute on function public.finalize_kyc_request(uuid, uuid, text, text, text, jsonb)
  to service_role;
grant execute on function public.fail_kyc_request(uuid, uuid, text)
  to service_role;
grant execute on function public.review_kyc_request(uuid, text, text, text, date)
  to service_role;

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
  where id = 'chido-casino-games';

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

create or replace function private.enforce_deposit_intent_compliance()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if new.provider = 'mercadopago'
     and new.status in ('created', 'processing', 'pending', 'credited') then
    select * into v_profile
    from public.profiles
    where user_id = new.user_id;

    if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
    if lower(coalesce(v_profile.kyc_status, '')) <> 'approved' then
      raise exception 'KYC_REQUIRED';
    end if;
    if v_profile.age_verified_at is null
       or v_profile.date_of_birth is null
       or v_profile.date_of_birth > (current_date - interval '18 years')::date then
      raise exception 'AGE_VERIFICATION_REQUIRED';
    end if;
    if v_profile.self_excluded_until is not null
       and v_profile.self_excluded_until > now() then
      raise exception 'SELF_EXCLUDED';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_deposit_intent_compliance on public.deposit_intents;
create trigger trg_deposit_intent_compliance
before insert or update of user_id, provider, status
on public.deposit_intents
for each row execute function private.enforce_deposit_intent_compliance();

commit;