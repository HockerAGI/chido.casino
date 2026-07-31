-- Restrict direct access to provably-fair seed material.
-- Hocker ONE and trusted server routes continue to use service_role.

begin;

alter table public.game_history enable row level security;

drop policy if exists "Public Game History" on public.game_history;

revoke all on table public.game_history from anon;
revoke all on table public.game_history from authenticated;

grant select, insert, update, delete on table public.game_history to service_role;

comment on table public.game_history is
  'Internal provably-fair history. Direct anon/authenticated access is prohibited because rows contain seed material.';

commit;
