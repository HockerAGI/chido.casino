begin;

-- Stripe is not an allowed payment provider for CHIDO. Mercado Pago remains
-- fail-closed at the application layer until legal, provider and KYC/AML gates
-- are explicitly enabled.
alter table public.deposit_intents
  alter column provider drop default,
  alter column intent_id set not null;

alter table public.deposit_intents
  drop constraint if exists deposit_intents_provider_allowed;

alter table public.deposit_intents
  add constraint deposit_intents_provider_allowed
  check (provider = 'mercadopago') not valid;

alter table public.deposit_intents
  validate constraint deposit_intents_provider_allowed;

alter table public.deposit_intents
  drop constraint if exists deposit_intents_amount_positive;

alter table public.deposit_intents
  add constraint deposit_intents_amount_positive
  check (amount > 0) not valid;

alter table public.deposit_intents
  validate constraint deposit_intents_amount_positive;

alter table public.deposit_intents
  drop constraint if exists deposit_intents_currency_mxn;

alter table public.deposit_intents
  add constraint deposit_intents_currency_mxn
  check (upper(currency) = 'MXN') not valid;

alter table public.deposit_intents
  validate constraint deposit_intents_currency_mxn;

alter table public.deposit_intents
  drop constraint if exists deposit_intents_status_allowed;

alter table public.deposit_intents
  add constraint deposit_intents_status_allowed
  check (
    status in (
      'created',
      'processing',
      'pending',
      'credited',
      'failed',
      'review_required',
      'cancelled',
      'canceled',
      'rejected'
    )
  ) not valid;

alter table public.deposit_intents
  validate constraint deposit_intents_status_allowed;

create unique index if not exists deposit_intents_provider_external_id_uidx
  on public.deposit_intents(provider, external_id)
  where external_id is not null;

-- Keep one canonical transaction audit trigger. Historical evidence is not
-- deleted; this only prevents future duplicate audit rows.
drop trigger if exists trg_audit_transactions on public.transactions;

-- The retired Stripe worker currently receives an unauthorized request every
-- minute. Unschedule by stable job name rather than generated job ID.
do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'stripe-sync-worker'
  ) then
    perform cron.unschedule('stripe-sync-worker');
  end if;
end
$$;

comment on column public.deposit_intents.provider is
  'CHIDO deposit provider. Mercado Pago only; production use requires application compliance gates.';

comment on column public.deposit_intents.status is
  'Deposit state machine: created -> processing -> pending|credited|failed|review_required.';

commit;
