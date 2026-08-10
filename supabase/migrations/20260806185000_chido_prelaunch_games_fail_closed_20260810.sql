begin;

-- Prelaunch safety invariant: real-money game writes remain disabled until a
-- future, separately approved regulatory release explicitly changes this row.
insert into public.system_controls (
  id,
  project_id,
  kill_switch,
  allow_write,
  meta,
  updated_at,
  created_at
) values (
  'chido-casino-games',
  'chido-casino',
  true,
  false,
  jsonb_build_object(
    'reason', 'Prelaunch regulatory gate: real-money games disabled',
    'release_gate', 'legal_kyc_aml_provider_owner_approval_required',
    'source', '20260806185000_chido_prelaunch_games_fail_closed_20260810'
  ),
  now(),
  now()
)
on conflict (project_id, id) do update
set kill_switch = true,
    allow_write = false,
    meta = coalesce(public.system_controls.meta, '{}'::jsonb) || excluded.meta,
    updated_at = now();

commit;
