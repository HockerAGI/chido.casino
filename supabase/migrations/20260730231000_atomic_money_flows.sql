-- Atomic money flows for Chido Casino.

create or replace function public.apply_deposit_promo_atomic(
  p_user_id uuid,
  p_deposit_amount numeric,
  p_deposit_ref text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim public.promo_claims%rowtype;
  v_offer public.promo_offers%rowtype;
  v_profile public.profiles%rowtype;
  v_bonus numeric := 0;
  v_free_rounds integer := 0;
  v_wager_multiplier numeric := 0;
  v_wager_required numeric := 0;
  v_ref text;
  v_wallet jsonb;
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;
  if coalesce(p_deposit_amount, 0) <= 0 then raise exception 'INVALID_DEPOSIT_AMOUNT'; end if;
  if nullif(trim(p_deposit_ref), '') is null then raise exception 'DEPOSIT_REF_REQUIRED'; end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if found and coalesce(v_profile.wager_required, 0) > coalesce(v_profile.wager_progress, 0) then
    return jsonb_build_object('ok', false, 'error', 'WAGERING_ALREADY_ACTIVE', 'source', 'daily_streak');
  end if;

  select * into v_claim
  from public.promo_claims
  where user_id = p_user_id and status = 'active'
  order by claimed_at desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', true, 'applied', false, 'reason', 'NO_ACTIVE_CLAIM');
  end if;

  select * into v_offer from public.promo_offers where id = v_claim.offer_id for share;
  if not found or not coalesce(v_offer.active, false) then
    return jsonb_build_object('ok', false, 'error', 'OFFER_NOT_ACTIVE');
  end if;
  if v_offer.starts_at is not null and v_offer.starts_at > now() then
    return jsonb_build_object('ok', false, 'error', 'OFFER_NOT_STARTED');
  end if;
  if v_offer.ends_at is not null and v_offer.ends_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'OFFER_EXPIRED');
  end if;
  if v_claim.expires_at is not null and v_claim.expires_at <= now() then
    update public.promo_claims
    set status = 'expired',
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('expired_at', now())
    where id = v_claim.id;
    return jsonb_build_object('ok', false, 'error', 'CLAIM_EXPIRED');
  end if;
  if p_deposit_amount < coalesce(v_offer.min_deposit, 0) then
    return jsonb_build_object(
      'ok', true,
      'applied', false,
      'reason', 'MIN_DEPOSIT_NOT_MET',
      'minimum', coalesce(v_offer.min_deposit, 0)
    );
  end if;

  v_bonus := round(
    least(
      case
        when coalesce(v_offer.max_bonus, 0) > 0 then v_offer.max_bonus
        else p_deposit_amount * coalesce(v_offer.bonus_percent, 0) / 100
      end,
      p_deposit_amount * coalesce(v_offer.bonus_percent, 0) / 100
    ),
    2
  );
  v_bonus := greatest(coalesce(v_bonus, 0), 0);
  v_free_rounds := greatest(coalesce(v_offer.free_rounds, 0), 0);
  v_wager_multiplier := greatest(coalesce(v_offer.wagering_multiplier, 0), 0);
  v_wager_required := round(v_bonus * v_wager_multiplier, 2);
  v_ref := 'promo:' || v_claim.id::text || ':deposit:' || trim(p_deposit_ref);

  if v_bonus > 0 then
    v_wallet := public.wallet_apply_delta(
      p_user_id => p_user_id,
      p_delta_balance => 0,
      p_delta_bonus => v_bonus,
      p_delta_locked => 0,
      p_reason => 'promo_bonus',
      p_ref_id => v_ref,
      p_method => 'manual',
      p_metadata => jsonb_build_object(
        'promo_claim_id', v_claim.id,
        'promo_offer_id', v_offer.id,
        'promo_slug', v_offer.slug,
        'deposit_ref', p_deposit_ref,
        'deposit_amount', p_deposit_amount,
        'wager_required', v_wager_required
      )
    );
    if coalesce(v_wallet->>'ok', 'false') <> 'true' then
      raise exception 'PROMO_WALLET_APPLY_FAILED';
    end if;
  end if;

  if v_free_rounds > 0 then
    insert into public.free_round_entitlements(
      user_id, game, remaining, source, expires_at, metadata, ref_id
    )
    values (
      p_user_id,
      'crash',
      v_free_rounds,
      'promo',
      v_offer.ends_at,
      jsonb_build_object(
        'promo_claim_id', v_claim.id,
        'promo_offer_id', v_offer.id,
        'deposit_ref', p_deposit_ref
      ),
      v_ref || ':free_rounds'
    )
    on conflict (ref_id) where ref_id is not null do nothing;
  end if;

  update public.promo_claims
  set status = case when v_wager_required > 0 then 'applied' else 'completed' end,
      bonus_awarded = v_bonus,
      free_rounds_awarded = v_free_rounds,
      wagering_required = v_wager_required,
      wagering_progress = 0,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'applied_at', now(),
        'deposit_ref', p_deposit_ref,
        'ref_id', v_ref,
        'reward_atomic', true
      )
  where id = v_claim.id;

  return jsonb_build_object(
    'ok', true,
    'applied', (v_bonus > 0 or v_free_rounds > 0),
    'claim_id', v_claim.id,
    'offer_id', v_offer.id,
    'offer_slug', v_offer.slug,
    'bonus_awarded', v_bonus,
    'free_rounds_awarded', v_free_rounds,
    'wagering_required', v_wager_required,
    'wallet', v_wallet
  );
end;
$$;

create or replace function public.credit_affiliate_first_deposit_atomic(
  p_user_id uuid,
  p_deposit_amount numeric,
  p_intent_id text,
  p_reward numeric default 20,
  p_minimum numeric default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_referral public.affiliate_referrals%rowtype;
  v_affiliate_user_id uuid;
  v_ref text;
  v_wallet jsonb;
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;
  if coalesce(p_deposit_amount, 0) <= 0 then raise exception 'INVALID_DEPOSIT_AMOUNT'; end if;
  if nullif(trim(p_intent_id), '') is null then raise exception 'INTENT_ID_REQUIRED'; end if;
  if coalesce(p_reward, 0) <= 0 or p_deposit_amount < coalesce(p_minimum, 0) then
    return jsonb_build_object('ok', true, 'credited', false, 'reason', 'NOT_ELIGIBLE');
  end if;

  select * into v_referral
  from public.affiliate_referrals
  where referred_user_id = p_user_id
  order by created_at asc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', true, 'credited', false, 'reason', 'NO_REFERRAL');
  end if;
  if v_referral.status not in ('tracked', 'registered') then
    return jsonb_build_object(
      'ok', true,
      'credited', false,
      'idempotent', true,
      'reason', 'ALREADY_PROCESSED',
      'status', v_referral.status
    );
  end if;

  v_affiliate_user_id := coalesce(v_referral.affiliate_user_id, v_referral.referrer_id);
  if v_affiliate_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'AFFILIATE_USER_MISSING');
  end if;

  v_ref := 'aff_firstdep:' || trim(p_intent_id);
  perform pg_advisory_xact_lock(hashtextextended(v_ref, 0));

  if exists(select 1 from public.affiliate_commissions where ref_id = v_ref) then
    return jsonb_build_object('ok', true, 'credited', true, 'idempotent', true, 'ref_id', v_ref);
  end if;

  insert into public.affiliate_commissions(
    affiliate_user_id, referred_user_id, amount, reason, ref_id, status, metadata
  )
  values (
    v_affiliate_user_id,
    p_user_id,
    round(p_reward, 2),
    'first_deposit_bonus',
    v_ref,
    'pending',
    jsonb_build_object('deposit_amount', p_deposit_amount, 'intent_id', p_intent_id)
  );

  v_wallet := public.wallet_apply_delta(
    p_user_id => v_affiliate_user_id,
    p_delta_balance => round(p_reward, 2),
    p_delta_bonus => 0,
    p_delta_locked => 0,
    p_reason => 'affiliate_first_deposit',
    p_ref_id => v_ref,
    p_method => 'internal_game',
    p_metadata => jsonb_build_object(
      'referred_user_id', p_user_id,
      'intent_id', p_intent_id
    )
  );
  if coalesce(v_wallet->>'ok', 'false') <> 'true' then
    raise exception 'AFFILIATE_WALLET_APPLY_FAILED';
  end if;

  update public.affiliate_commissions
  set status = 'credited',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('credited_at', now())
  where ref_id = v_ref;

  update public.affiliate_referrals
  set status = 'first_deposit',
      first_deposit_amount = p_deposit_amount,
      first_deposit_at = now(),
      total_deposited = coalesce(total_deposited, 0) + p_deposit_amount,
      total_commission = coalesce(total_commission, 0) + round(p_reward, 2),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'first_deposit_intent_id', p_intent_id,
        'first_deposit_reward', round(p_reward, 2)
      )
  where id = v_referral.id;

  return jsonb_build_object(
    'ok', true,
    'credited', true,
    'idempotent', false,
    'affiliate_user_id', v_affiliate_user_id,
    'amount', round(p_reward, 2),
    'ref_id', v_ref,
    'wallet', v_wallet
  );
end;
$$;

create or replace function public.credit_deposit_atomic(
  p_intent_id text,
  p_provider text,
  p_external_id text,
  p_user_id uuid,
  p_amount numeric,
  p_currency text,
  p_provider_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_intent public.deposit_intents%rowtype;
  v_wallet jsonb;
  v_promo jsonb;
  v_affiliate jsonb;
  v_ref text;
begin
  if nullif(trim(p_intent_id), '') is null then raise exception 'INTENT_ID_REQUIRED'; end if;
  if nullif(trim(p_provider), '') is null then raise exception 'PROVIDER_REQUIRED'; end if;
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if upper(coalesce(p_currency, '')) <> 'MXN' then raise exception 'CURRENCY_MISMATCH'; end if;

  perform pg_advisory_xact_lock(hashtextextended('deposit:' || trim(p_intent_id), 0));
  select * into v_intent
  from public.deposit_intents
  where intent_id = trim(p_intent_id)
  for update;

  if not found then raise exception 'DEPOSIT_INTENT_NOT_FOUND'; end if;
  if v_intent.user_id <> p_user_id then raise exception 'DEPOSIT_USER_MISMATCH'; end if;
  if lower(v_intent.provider) <> lower(trim(p_provider)) then raise exception 'DEPOSIT_PROVIDER_MISMATCH'; end if;
  if upper(coalesce(v_intent.currency, 'MXN')) <> upper(p_currency) then raise exception 'DEPOSIT_CURRENCY_MISMATCH'; end if;
  if abs(v_intent.amount - p_amount) > 0.01 then raise exception 'DEPOSIT_AMOUNT_MISMATCH'; end if;

  if v_intent.status = 'credited' then
    return jsonb_build_object(
      'ok', true,
      'credited', true,
      'idempotent', true,
      'intent_id', v_intent.intent_id,
      'external_id', v_intent.external_id
    );
  end if;
  if v_intent.status in ('failed', 'cancelled', 'canceled', 'rejected') then
    raise exception 'DEPOSIT_INTENT_FINAL';
  end if;

  v_ref := lower(trim(p_provider)) || '_deposit:' || trim(p_intent_id);
  v_wallet := public.wallet_apply_delta(
    p_user_id => p_user_id,
    p_delta_balance => round(p_amount, 2),
    p_delta_bonus => 0,
    p_delta_locked => 0,
    p_reason => 'deposit_' || lower(trim(p_provider)),
    p_ref_id => v_ref,
    p_method => case when lower(trim(p_provider)) in ('mercadopago', 'stripe') then 'card' else 'manual' end,
    p_metadata => jsonb_build_object(
      'external_id', p_external_id,
      'intent_id', p_intent_id,
      'provider', lower(trim(p_provider)),
      'currency', upper(p_currency)
    ) || coalesce(p_provider_payload, '{}'::jsonb)
  );
  if coalesce(v_wallet->>'ok', 'false') <> 'true' then
    raise exception 'DEPOSIT_WALLET_APPLY_FAILED';
  end if;

  v_promo := public.apply_deposit_promo_atomic(p_user_id, p_amount, p_intent_id);
  if coalesce(v_promo->>'ok', 'true') <> 'true'
     and coalesce(v_promo->>'error', '') <> 'WAGERING_ALREADY_ACTIVE' then
    raise exception 'DEPOSIT_PROMO_APPLY_FAILED';
  end if;

  v_affiliate := public.credit_affiliate_first_deposit_atomic(
    p_user_id, p_amount, p_intent_id, 20, 50
  );
  if coalesce(v_affiliate->>'ok', 'true') <> 'true' then
    raise exception 'DEPOSIT_AFFILIATE_APPLY_FAILED';
  end if;

  update public.deposit_intents
  set status = 'credited',
      external_id = coalesce(nullif(trim(p_external_id), ''), external_id),
      provider_payload = coalesce(provider_payload, '{}'::jsonb) || coalesce(p_provider_payload, '{}'::jsonb),
      bonus_applied = coalesce((v_promo->>'applied')::boolean, false),
      free_spins_awarded = coalesce((v_promo->>'free_rounds_awarded')::integer, 0),
      updated_at = now()
  where id = v_intent.id;

  update public.profiles
  set last_deposit_amount = p_amount,
      last_deposit_at = now(),
      updated_at = now()
  where id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'credited', true,
    'idempotent', coalesce((v_wallet->>'idempotent')::boolean, false),
    'intent_id', p_intent_id,
    'external_id', p_external_id,
    'amount', round(p_amount, 2),
    'wallet', v_wallet,
    'promo', v_promo,
    'affiliate', v_affiliate
  );
end;
$$;

-- Replace legacy overloads so all callers use one canonical contract.
drop function if exists public.admin_confirm_manual_deposit(text, numeric, text, text);
drop function if exists public.admin_confirm_manual_deposit(text, numeric, text, text, text, jsonb);

create function public.admin_confirm_manual_deposit(
  p_folio text,
  p_amount numeric default null,
  p_ref_id text default null,
  p_status text default 'approved',
  p_reason text default null,
  p_meta jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_req public.manual_deposit_requests%rowtype;
  v_status text;
  v_amount numeric;
  v_ref text;
  v_wallet jsonb;
  v_promo jsonb;
  v_affiliate jsonb;
begin
  if nullif(trim(p_folio), '') is null then raise exception 'FOLIO_REQUIRED'; end if;

  select * into v_req
  from public.manual_deposit_requests
  where folio = trim(p_folio)
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND', 'folio', p_folio);
  end if;

  v_status := lower(trim(coalesce(nullif(p_status, ''), 'approved')));
  if v_status not in ('approved', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'INVALID_STATUS');
  end if;

  if v_req.status <> 'pending' then
    if (v_status = 'approved' and v_req.status in ('approved', 'confirmed'))
       or (v_status = 'rejected' and v_req.status = 'rejected') then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'deposit_id', v_req.id,
        'user_id', v_req.user_id,
        'amount', v_req.amount,
        'status', v_req.status
      );
    end if;
    return jsonb_build_object('ok', false, 'error', 'STATUS_CONFLICT', 'status', v_req.status);
  end if;

  v_amount := coalesce(p_amount, v_req.amount);
  if v_amount is null or v_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'INVALID_AMOUNT');
  end if;
  if p_amount is not null and abs(p_amount - v_req.amount) > 0.01 then
    return jsonb_build_object('ok', false, 'error', 'AMOUNT_MISMATCH');
  end if;

  v_ref := coalesce(nullif(trim(p_ref_id), ''), 'manual_deposit:' || v_req.folio);

  if v_status = 'rejected' then
    update public.manual_deposit_requests
    set status = 'rejected',
        reviewed_at = now(),
        reviewed_by = coalesce(p_meta->>'reviewed_by', 'admin_api'),
        updated_at = now(),
        metadata = coalesce(metadata, '{}'::jsonb)
          || coalesce(p_meta, '{}'::jsonb)
          || jsonb_build_object('ref_id', v_ref, 'reason', p_reason)
    where id = v_req.id;

    return jsonb_build_object(
      'ok', true,
      'idempotent', false,
      'deposit_id', v_req.id,
      'user_id', v_req.user_id,
      'amount', v_amount,
      'status', 'rejected'
    );
  end if;

  v_wallet := public.wallet_apply_delta(
    p_user_id => v_req.user_id,
    p_delta_balance => v_amount,
    p_delta_bonus => 0,
    p_delta_locked => 0,
    p_reason => coalesce(nullif(p_reason, ''), 'deposit_manual'),
    p_ref_id => v_ref,
    p_method => coalesce(nullif(v_req.method, ''), 'spei'),
    p_metadata => jsonb_build_object(
      'folio', v_req.folio,
      'deposit_id', v_req.id,
      'source', 'admin_confirm_manual_deposit'
    ) || coalesce(p_meta, '{}'::jsonb)
  );
  if coalesce(v_wallet->>'ok', 'false') <> 'true' then
    raise exception 'MANUAL_DEPOSIT_WALLET_FAILED';
  end if;

  v_promo := public.apply_deposit_promo_atomic(v_req.user_id, v_amount, v_req.folio);
  if coalesce(v_promo->>'ok', 'true') <> 'true'
     and coalesce(v_promo->>'error', '') <> 'WAGERING_ALREADY_ACTIVE' then
    raise exception 'MANUAL_DEPOSIT_PROMO_FAILED';
  end if;

  v_affiliate := public.credit_affiliate_first_deposit_atomic(v_req.user_id, v_amount, v_req.folio, 20, 50);
  if coalesce(v_affiliate->>'ok', 'true') <> 'true' then
    raise exception 'MANUAL_DEPOSIT_AFFILIATE_FAILED';
  end if;

  update public.manual_deposit_requests
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by = coalesce(p_meta->>'reviewed_by', 'admin_api'),
      updated_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb)
        || coalesce(p_meta, '{}'::jsonb)
        || jsonb_build_object(
          'ref_id', v_ref,
          'reason', p_reason,
          'wallet_tx_id', v_wallet->>'tx_id',
          'promo', v_promo,
          'affiliate', v_affiliate
        )
  where id = v_req.id;

  update public.profiles
  set last_deposit_amount = v_amount,
      last_deposit_at = now(),
      updated_at = now()
  where id = v_req.user_id;

  return jsonb_build_object(
    'ok', true,
    'idempotent', coalesce((v_wallet->>'idempotent')::boolean, false),
    'deposit_id', v_req.id,
    'user_id', v_req.user_id,
    'amount', v_amount,
    'status', 'approved',
    'wallet', v_wallet,
    'promo', v_promo,
    'affiliate', v_affiliate
  );
end;
$$;

create or replace function public.create_withdrawal_request_atomic(
  p_user_id uuid,
  p_amount numeric,
  p_external_id text,
  p_provider text,
  p_clabe text,
  p_beneficiary text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.withdraw_requests%rowtype;
  v_wallet jsonb;
  v_id uuid;
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if nullif(trim(p_external_id), '') is null then raise exception 'EXTERNAL_ID_REQUIRED'; end if;
  if trim(coalesce(p_clabe, '')) !~ '^[0-9]{18}$' then raise exception 'INVALID_CLABE'; end if;
  if length(trim(coalesce(p_beneficiary, ''))) < 3 then raise exception 'INVALID_BENEFICIARY'; end if;

  perform pg_advisory_xact_lock(hashtextextended('withdraw_request:' || trim(p_external_id), 0));

  select * into v_existing
  from public.withdraw_requests
  where external_id = trim(p_external_id)
  limit 1;

  if found then
    if v_existing.user_id <> p_user_id or abs(v_existing.amount - p_amount) > 0.01 then
      raise exception 'WITHDRAW_REQUEST_CONFLICT';
    end if;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'withdrawal_id', v_existing.id,
      'external_id', v_existing.external_id,
      'status', v_existing.status,
      'amount', v_existing.amount,
      'provider', v_existing.provider
    );
  end if;

  v_wallet := public.wallet_apply_delta(
    p_user_id => p_user_id,
    p_delta_balance => -round(p_amount, 2),
    p_delta_bonus => 0,
    p_delta_locked => round(p_amount, 2),
    p_reason => 'withdraw_request',
    p_ref_id => trim(p_external_id),
    p_method => 'spei',
    p_metadata => jsonb_build_object(
      'provider', lower(coalesce(nullif(trim(p_provider), ''), 'manual')),
      'clabe_last4', right(trim(p_clabe), 4)
    ) || coalesce(p_metadata, '{}'::jsonb)
  );
  if coalesce(v_wallet->>'ok', 'false') <> 'true' then
    raise exception 'WITHDRAW_WALLET_LOCK_FAILED';
  end if;

  insert into public.withdraw_requests(
    user_id, amount, currency, method, destination, status, metadata,
    provider, external_id, clabe, beneficiary, provider_payload
  )
  values (
    p_user_id,
    round(p_amount, 2),
    'MXN',
    'spei',
    trim(p_clabe),
    'pending',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'beneficiary', trim(p_beneficiary),
      'external_id', trim(p_external_id),
      'provider', lower(coalesce(nullif(trim(p_provider), ''), 'manual')),
      'wallet_tx_id', v_wallet->>'tx_id'
    ),
    lower(coalesce(nullif(trim(p_provider), ''), 'manual')),
    trim(p_external_id),
    trim(p_clabe),
    trim(p_beneficiary),
    '{}'::jsonb
  )
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'withdrawal_id', v_id,
    'external_id', trim(p_external_id),
    'status', 'pending',
    'amount', round(p_amount, 2),
    'provider', lower(coalesce(nullif(trim(p_provider), ''), 'manual')),
    'wallet', v_wallet
  );
end;
$$;

create or replace function public.admin_settle_withdrawal(
  p_external_id text,
  p_final_action text,
  p_provider_payload jsonb default '{}'::jsonb,
  p_note text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_req public.withdraw_requests%rowtype;
  v_action text;
  v_final_status text;
  v_ref text;
  v_wallet jsonb;
begin
  if nullif(trim(p_external_id), '') is null then raise exception 'EXTERNAL_ID_REQUIRED'; end if;

  v_action := lower(trim(coalesce(p_final_action, '')));
  if v_action not in ('paid', 'reject', 'failed', 'refund') then
    return jsonb_build_object('ok', false, 'error', 'INVALID_ACTION');
  end if;
  v_final_status := case v_action
    when 'paid' then 'paid'
    when 'reject' then 'rejected'
    when 'failed' then 'failed'
    else 'refunded'
  end;

  select * into v_req
  from public.withdraw_requests
  where external_id = trim(p_external_id) or id::text = trim(p_external_id)
  order by created_at desc
  limit 1
  for update;

  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;

  if v_req.status in ('paid', 'rejected', 'failed', 'refunded') then
    if v_req.status = v_final_status then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'status', v_req.status,
        'external_id', coalesce(v_req.external_id, v_req.id::text)
      );
    end if;
    return jsonb_build_object(
      'ok', false,
      'error', 'FINAL_STATUS_CONFLICT',
      'status', v_req.status,
      'requested_status', v_final_status
    );
  end if;
  if v_req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'INVALID_CURRENT_STATUS', 'status', v_req.status);
  end if;

  v_ref := coalesce(
    nullif(trim(p_idempotency_key), ''),
    'withdraw_settle:' || coalesce(v_req.external_id, v_req.id::text) || ':' || v_final_status
  );

  if v_action = 'paid' then
    v_wallet := public.wallet_apply_delta(
      p_user_id => v_req.user_id,
      p_delta_balance => 0,
      p_delta_bonus => 0,
      p_delta_locked => -v_req.amount,
      p_reason => 'withdraw_paid',
      p_ref_id => v_ref,
      p_method => coalesce(nullif(v_req.method, ''), 'spei'),
      p_metadata => jsonb_build_object(
        'withdraw_request_id', v_req.id,
        'external_id', v_req.external_id,
        'note', p_note
      )
    );
  else
    v_wallet := public.wallet_apply_delta(
      p_user_id => v_req.user_id,
      p_delta_balance => v_req.amount,
      p_delta_bonus => 0,
      p_delta_locked => -v_req.amount,
      p_reason => 'withdraw_refund',
      p_ref_id => v_ref,
      p_method => coalesce(nullif(v_req.method, ''), 'spei'),
      p_metadata => jsonb_build_object(
        'withdraw_request_id', v_req.id,
        'external_id', v_req.external_id,
        'final_status', v_final_status,
        'note', p_note
      )
    );
  end if;

  if coalesce(v_wallet->>'ok', 'false') <> 'true' then
    raise exception 'WITHDRAW_WALLET_SETTLEMENT_FAILED';
  end if;

  update public.withdraw_requests
  set status = v_final_status,
      provider_payload = coalesce(provider_payload, '{}'::jsonb) || coalesce(p_provider_payload, '{}'::jsonb),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'settled_at', now(),
        'settlement_ref', v_ref,
        'settlement_action', v_action,
        'settlement_note', p_note,
        'wallet_tx_id', v_wallet->>'tx_id'
      ),
      updated_at = now()
  where id = v_req.id;

  return jsonb_build_object(
    'ok', true,
    'idempotent', coalesce((v_wallet->>'idempotent')::boolean, false),
    'status', v_final_status,
    'external_id', coalesce(v_req.external_id, v_req.id::text),
    'wallet', v_wallet
  );
end;
$$;
