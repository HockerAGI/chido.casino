begin;

-- Stripe is not an allowed payment provider for CHIDO. Mercado Pago remains
-- fail-closed at the application layer until legal, provider and KYC/AML gates
-- are explicitly enabled.
alter table public.deposit_intents
  alter column provider drop default;

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

commit;
