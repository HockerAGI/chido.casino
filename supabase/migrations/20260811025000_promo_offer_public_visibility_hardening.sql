begin;

-- Public promo discovery must expose only offers that are both explicitly active
-- and currently inside their configured availability window. service_role keeps
-- administrative access through its existing policy.

drop policy if exists "promo_offers_select_window" on public.promo_offers;
drop policy if exists "promo_offers_select_active_window" on public.promo_offers;

create policy "promo_offers_select_active_window"
on public.promo_offers
for select
to anon, authenticated
using (
  active is true
  and starts_at <= now()
  and (ends_at is null or ends_at > now())
);

commit;
