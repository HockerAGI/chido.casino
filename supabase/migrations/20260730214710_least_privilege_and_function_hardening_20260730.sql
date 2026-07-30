-- Applied to production on 2026-07-30.
-- Removes accidental public grants and hardens privileged functions.

revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;

grant select on table public.agis_public_catalog to anon, authenticated;
grant select on table public.promo_offers to anon, authenticated;
grant select on table public.cashback_tiers to anon, authenticated;
grant select on table public.free_round_tiers to anon, authenticated;
grant select on table public.game_history to anon, authenticated;

revoke all privileges on table public.audit_chain from authenticated;
grant select on table public.audit_chain to authenticated;
revoke all privileges on table public.audit_exports from authenticated;
grant select on table public.audit_exports to authenticated;
revoke all privileges on table public.bets from authenticated;
grant select, insert on table public.bets to authenticated;
revoke all privileges on table public.cashback_events from authenticated;
grant select on table public.cashback_events to authenticated;
revoke all privileges on table public.cashback_tiers from authenticated;
grant select on table public.cashback_tiers to authenticated;
revoke all privileges on table public.casino_settings from authenticated;

revoke all privileges on table public.client_brand_context from authenticated;
grant select on table public.client_brand_context to authenticated;
revoke all privileges on table public.client_campaign_history from authenticated;
grant select on table public.client_campaign_history to authenticated;
revoke all privileges on table public.client_comment_insights from authenticated;
grant select on table public.client_comment_insights to authenticated;
revoke all privileges on table public.client_content_history from authenticated;
grant select on table public.client_content_history to authenticated;
revoke all privileges on table public.client_context_profiles from authenticated;
grant select on table public.client_context_profiles to authenticated;

revoke all privileges on table public.command_logs from authenticated;
revoke all privileges on table public.commands from authenticated;
grant select, insert, update, delete on table public.commands to authenticated;
revoke all privileges on table public.crash_bets from authenticated;
grant select on table public.crash_bets to authenticated;
revoke all privileges on table public.events from authenticated;
grant select, insert, update, delete on table public.events to authenticated;
revoke all privileges on table public.fraud_events from authenticated;
revoke all privileges on table public.free_round_entitlements from authenticated;
grant select on table public.free_round_entitlements to authenticated;
revoke all privileges on table public.free_round_tiers from authenticated;
grant select on table public.free_round_tiers to authenticated;
revoke all privileges on table public.game_history from authenticated;
grant select on table public.game_history to authenticated;
revoke all privileges on table public.hocker_agent_logs from authenticated;
revoke all privileges on table public.hocker_dashboard_snapshot from authenticated;
grant select on table public.hocker_dashboard_snapshot to authenticated;
revoke all privileges on table public.hocker_tenants from authenticated;
revoke all privileges on table public.llm_usage from authenticated;
grant select on table public.llm_usage to authenticated;
revoke all privileges on table public.memory_archive_manifest from authenticated;
grant select on table public.memory_archive_manifest to authenticated;
revoke all privileges on table public.node_heartbeats from authenticated;
grant select on table public.node_heartbeats to authenticated;
revoke all privileges on table public.nodes from authenticated;
grant select, insert, update, delete on table public.nodes to authenticated;
revoke all privileges on table public.nova_messages from authenticated;
revoke all privileges on table public.nova_threads from authenticated;
revoke all privileges on table public.observability_alerts from authenticated;
grant select on table public.observability_alerts to authenticated;
revoke all privileges on table public.observability_incidents from authenticated;
grant select on table public.observability_incidents to authenticated;
revoke all privileges on table public.projects from authenticated;
revoke all privileges on table public.promo_offers from authenticated;
grant select on table public.promo_offers to authenticated;
revoke all privileges on table public.supply_products from authenticated;
grant select, insert, update, delete on table public.supply_products to authenticated;
revoke all privileges on table public.v_agi_operational_state from authenticated;
grant select on table public.v_agi_operational_state to authenticated;
revoke all privileges on table public.v_queue_without_run from authenticated;
grant select on table public.v_queue_without_run to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_user_chido() from public, anon, authenticated;
revoke execute on function public.handle_new_user_profile() from public, anon, authenticated;
revoke execute on function public.prevent_profile_self_escalation() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role, supabase_auth_admin;
grant execute on function public.handle_new_user_chido() to service_role, supabase_auth_admin;
grant execute on function public.handle_new_user_profile() to service_role, supabase_auth_admin;
grant execute on function public.prevent_profile_self_escalation() to service_role;

alter function public.is_project_member(text) set search_path = public, pg_temp;
revoke execute on function public.is_project_member(text) from public, anon;
grant execute on function public.is_project_member(text) to authenticated, service_role;
revoke execute on function public.is_project_admin(text) from public, anon;
grant execute on function public.is_project_admin(text) to authenticated, service_role;

alter function stripe.set_updated_at() set search_path = stripe, pg_temp;
alter function stripe.set_updated_at_metadata() set search_path = stripe, pg_temp;
alter function stripe.check_rate_limit(text, integer, integer) set search_path = stripe, pg_temp;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
