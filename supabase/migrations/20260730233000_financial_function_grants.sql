-- Financial functions are server-only. RLS does not protect SECURITY DEFINER entry points.

revoke all on function public.wallet_apply_delta(uuid,numeric,numeric,numeric,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.admin_confirm_manual_deposit(text,numeric,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.create_withdrawal_request_atomic(uuid,numeric,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.admin_settle_withdrawal(text,text,jsonb,text,text) from public, anon, authenticated;
revoke all on function public.apply_deposit_promo_atomic(uuid,numeric,text) from public, anon, authenticated;
revoke all on function public.credit_affiliate_first_deposit_atomic(uuid,numeric,text,numeric,numeric) from public, anon, authenticated;
revoke all on function public.credit_deposit_atomic(text,text,text,uuid,numeric,text,jsonb) from public, anon, authenticated;
revoke all on function public.credit_affiliate_wager_commission_atomic(uuid,numeric,text,text,numeric) from public, anon, authenticated;
revoke all on function public.record_wager_effects(uuid,numeric,text,text,numeric) from public, anon, authenticated;
revoke all on function public.apply_wager_progress(uuid,numeric) from public, anon, authenticated;
revoke all on function public._distribute_affiliate_commission(uuid,uuid,numeric,numeric,text,text) from public, anon, authenticated;
revoke all on function public.claim_daily_streak(uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.get_daily_streak_status(uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.casino_settle_crash(uuid,text,numeric,numeric,numeric,boolean,numeric,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.casino_settle_taco_slot(uuid,text,numeric,numeric,numeric,jsonb,text,text,text,bigint,jsonb) from public, anon, authenticated;

grant execute on function public.wallet_apply_delta(uuid,numeric,numeric,numeric,text,text,text,jsonb) to service_role;
grant execute on function public.admin_confirm_manual_deposit(text,numeric,text,text,text,jsonb) to service_role;
grant execute on function public.create_withdrawal_request_atomic(uuid,numeric,text,text,text,text,jsonb) to service_role;
grant execute on function public.admin_settle_withdrawal(text,text,jsonb,text,text) to service_role;
grant execute on function public.apply_deposit_promo_atomic(uuid,numeric,text) to service_role;
grant execute on function public.credit_affiliate_first_deposit_atomic(uuid,numeric,text,numeric,numeric) to service_role;
grant execute on function public.credit_deposit_atomic(text,text,text,uuid,numeric,text,jsonb) to service_role;
grant execute on function public.credit_affiliate_wager_commission_atomic(uuid,numeric,text,text,numeric) to service_role;
grant execute on function public.record_wager_effects(uuid,numeric,text,text,numeric) to service_role;
grant execute on function public.apply_wager_progress(uuid,numeric) to service_role;
grant execute on function public._distribute_affiliate_commission(uuid,uuid,numeric,numeric,text,text) to service_role;
grant execute on function public.claim_daily_streak(uuid,timestamptz) to service_role;
grant execute on function public.get_daily_streak_status(uuid,timestamptz) to service_role;
grant execute on function public.casino_settle_crash(uuid,text,numeric,numeric,numeric,boolean,numeric,text,text,jsonb) to service_role;
grant execute on function public.casino_settle_taco_slot(uuid,text,numeric,numeric,numeric,jsonb,text,text,text,bigint,jsonb) to service_role;
