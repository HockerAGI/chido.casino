# Supabase SECURITY DEFINER RPC Exceptions — 2026-08-11

## Scope

This note documents four Supabase Security Advisor warnings that remain intentionally present for Chido Casino:

- `public.get_public_leaderboard(integer, integer)`
- `public.get_public_recent_wins(integer)`
- `public.get_my_crash_history(integer)`
- `public.get_my_slot_history(integer)`

The warnings are not marked resolved or suppressed. They are treated as bounded exceptions that require regression coverage and periodic review.

## Why `SECURITY DEFINER` remains intentional

### Player-owned history

`get_my_crash_history` and `get_my_slot_history` are the controlled RPC boundary for a player to read completed game history that includes provably-fair verification material.

The underlying `crash_bets` and `slot_spins` tables are not directly readable by `authenticated`. The RPCs:

- use a fixed `search_path = public, pg_temp`;
- filter rows by `user_id = auth.uid()`;
- cap `p_limit` to `1..100`;
- revoke function execution from `public` and `anon`;
- grant execution only to `authenticated` and `service_role`;
- avoid requiring direct SELECT grants on the seed-bearing base tables.

Changing these functions to `SECURITY INVOKER` without redesigning the data boundary would either break player history or require widening direct table access. Neither is justified by the current evidence.

### Public leaderboard and recent wins

`get_public_leaderboard` and `get_public_recent_wins` are intentionally callable by `anon`/`authenticated`, but only expose a display name plus bounded aggregate/recent-win fields for profiles that explicitly opted in.

Controls:

- `profiles.leaderboard_opt_in` is `NOT NULL DEFAULT false`;
- a non-empty `public_display_name` is required;
- no email or KYC field is returned;
- leaderboard lookback is capped to 30 days;
- result limits are capped to 100 rows;
- functions use a fixed `search_path = public, pg_temp`.

At the 2026-08-11 production evidence cut, 0 of 8 profiles had `leaderboard_opt_in=true`, so the public feed had no opted-in profile to expose. This count is evidence for that cut only, not a permanent invariant.

## Provably-fair seed exposure

Completed Taco Slot and Crash responses/history include the server seed so the completed result can be verified against the previously stored hash and fairness algorithm.

The current application code generates a fresh random server seed for each new game request using Node `crypto.randomBytes`; the reviewed routes do not load a reusable server seed from an environment secret. The seed is used to compute the current result, persisted atomically, and returned for that completed request/idempotent replay.

This exception must be re-reviewed immediately if game design changes to a seed-chain, multi-round seed reuse, precommitted future seeds, provider-managed RNG, or any other model where revealing a completed round seed could affect future outcomes.

## Production evidence reviewed

Supabase production metadata on 2026-08-11 showed:

- all four functions are `SECURITY DEFINER` with fixed `search_path`;
- `get_my_*` is not executable by `anon` and is executable by `authenticated`/`service_role`;
- the private RPC definitions scope by `auth.uid()`;
- direct `authenticated` SELECT on `crash_bets` and `slot_spins` is revoked;
- the public RPCs require explicit leaderboard opt-in and non-empty public display name.

The definitions are versioned in this repository:

- `supabase/migrations/20260730230000_full_hardening_foundation.sql`
- `supabase/migrations/20260806181000_game_fairness_access_hardening_20260806.sql`
- `supabase/migrations/20260806182000_private_game_history_rpc_20260806.sql`

The applied Supabase migration history also contains `private_game_history_rpc_20260806` (`20260810184341`).

## Required regression conditions

CI must fail if any of these boundaries drift materially, including:

- removing fixed `search_path`;
- removing `auth.uid()` scoping from private history;
- granting private-history execution to `anon`;
- restoring direct authenticated SELECT on seed-bearing base tables;
- making leaderboard opt-in default true;
- removing explicit opt-in/display-name filters from public feeds;
- removing bounded result limits;
- changing game routes to load a reusable server seed secret without a new threat review.

## Re-review triggers

Re-open this exception before production if any of the following changes:

- grants, RLS, function ownership or exposed schemas;
- return columns or public profile fields;
- game fairness/RNG design;
- seed lifecycle or retention;
- Chido launch jurisdiction, license/operator status or real-money state;
- Supabase Advisor behavior or a safer equivalent boundary becomes available without widening table access.

## Status

**CONTROLLED / JUSTIFIED EXCEPTION — Advisor WARN remains visible.**

This is not a claim that Chido Casino is legally cleared for real-money operation. Legal launch gates remain independent and unchanged.
