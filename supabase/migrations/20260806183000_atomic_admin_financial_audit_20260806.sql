begin;

create or replace function public.admin_confirm_manual_deposit_audited(
  p_folio text,
  p_amount numeric,
  p_ref_id text,
  p_status text,
  p_reason text,
  p_meta jsonb,
  p_actor_id text,
  p_actor_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
  v_action text;
begin
  if nullif(btrim(coalesce(p_actor_id, '')), '') is null then
    raise exception 'ADMIN_ACTOR_REQUIRED';
  end if;

  v_result := public.admin_confirm_manual_deposit(
    p_folio,
    p_amount,
    p_ref_id,
    p_status,
    p_reason,
    coalesce(p_meta, '{}'::jsonb) || jsonb_build_object(
      'reviewed_by', p_actor_id,
      'actor_email', nullif(btrim(coalesce(p_actor_email, '')), '')
    )
  );

  if coalesce(v_result ->> 'ok', 'false') <> 'true' then
    return v_result;
  end if;

  v_action := case
    when lower(coalesce(p_status, 'approved')) = 'rejected'
      then 'admin_manual_deposit_rejected'
    else 'admin_manual_deposit_approved'
  end;

  insert into public.transactions_audit(
    transaction_id,
    changed_by,
    action,
    payload,
    created_at
  ) values (
    null,
    p_actor_id,
    v_action,
    jsonb_build_object(
      'actor_email', nullif(btrim(coalesce(p_actor_email, '')), ''),
      'folio', p_folio,
      'amount', p_amount,
      'status', v_result ->> 'status',
      'idempotent', coalesce((v_result ->> 'idempotent')::boolean, false),
      'deposit_id', v_result ->> 'deposit_id',
      'user_id', v_result ->> 'user_id',
      'reason', p_reason,
      'meta', coalesce(p_meta, '{}'::jsonb)
    ),
    now()
  );

  return v_result || jsonb_build_object('audit_recorded', true);
end;
$$;

create or replace function public.admin_settle_withdrawal_audited(
  p_external_id text,
  p_final_action text,
  p_provider_payload jsonb,
  p_note text,
  p_idempotency_key text,
  p_actor_id text,
  p_actor_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if nullif(btrim(coalesce(p_actor_id, '')), '') is null then
    raise exception 'ADMIN_ACTOR_REQUIRED';
  end if;

  v_result := public.admin_settle_withdrawal(
    p_external_id,
    p_final_action,
    coalesce(p_provider_payload, '{}'::jsonb),
    p_note,
    p_idempotency_key
  );

  if coalesce(v_result ->> 'ok', 'false') <> 'true' then
    return v_result;
  end if;

  insert into public.transactions_audit(
    transaction_id,
    changed_by,
    action,
    payload,
    created_at
  ) values (
    null,
    p_actor_id,
    'admin_settle_withdrawal',
    jsonb_build_object(
      'actor_email', nullif(btrim(coalesce(p_actor_email, '')), ''),
      'external_id', p_external_id,
      'requested_action', p_final_action,
      'final_status', v_result ->> 'status',
      'idempotent', coalesce((v_result ->> 'idempotent')::boolean, false),
      'idempotency_key', p_idempotency_key,
      'note', p_note,
      'provider_payload', coalesce(p_provider_payload, '{}'::jsonb)
    ),
    now()
  );

  return v_result || jsonb_build_object('audit_recorded', true);
end;
$$;

revoke all on function public.admin_confirm_manual_deposit(
  text, numeric, text, text, text, jsonb
) from public, anon, authenticated, service_role;
revoke all on function public.admin_settle_withdrawal(
  text, text, jsonb, text, text
) from public, anon, authenticated, service_role;

revoke all on function public.admin_confirm_manual_deposit_audited(
  text, numeric, text, text, text, jsonb, text, text
) from public, anon, authenticated;
revoke all on function public.admin_settle_withdrawal_audited(
  text, text, jsonb, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.admin_confirm_manual_deposit_audited(
  text, numeric, text, text, text, jsonb, text, text
) to service_role;
grant execute on function public.admin_settle_withdrawal_audited(
  text, text, jsonb, text, text, text, text
) to service_role;

comment on function public.admin_confirm_manual_deposit_audited(
  text, numeric, text, text, text, jsonb, text, text
) is 'Settles a manual deposit and records the authenticated admin actor in the same transaction.';
comment on function public.admin_settle_withdrawal_audited(
  text, text, jsonb, text, text, text, text
) is 'Settles a withdrawal and records the authenticated admin actor in the same transaction.';

commit;