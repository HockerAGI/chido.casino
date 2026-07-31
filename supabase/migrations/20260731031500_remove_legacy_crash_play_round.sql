-- Remove the unused legacy Crash settlement function.
-- The active casino flow uses casino_settle_crash, which is atomic and restricted to service_role.

begin;

drop function if exists public.crash_play_round(
  uuid,
  numeric,
  numeric,
  bigint,
  text,
  text,
  text,
  numeric
);

commit;
