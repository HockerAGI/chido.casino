begin;

alter table public.slot_spins
  drop constraint if exists slot_spins_amounts_valid,
  drop constraint if exists slot_spins_reels_valid,
  drop constraint if exists slot_spins_fairness_material_valid,
  drop constraint if exists slot_spins_payout_math_valid,
  drop constraint if exists slot_spins_nonce_valid,
  drop constraint if exists slot_spins_round_ref_valid;

alter table public.slot_spins
  add constraint slot_spins_amounts_valid
    check (bet_amount > 0 and payout_amount >= 0 and multiplier >= 0) not valid,
  add constraint slot_spins_reels_valid
    check (
      reels is not null
      and jsonb_typeof(reels) = 'array'
      and jsonb_array_length(reels) = 3
    ) not valid,
  add constraint slot_spins_fairness_material_valid
    check (
      server_seed_hash ~ '^[0-9a-f]{64}$'
      and nullif(btrim(server_seed), '') is not null
      and nullif(btrim(client_seed), '') is not null
    ) not valid,
  add constraint slot_spins_payout_math_valid
    check (
      abs(round(bet_amount * multiplier, 2) - round(payout_amount, 2)) <= 0.01
    ) not valid,
  add constraint slot_spins_nonce_valid
    check (nonce is not null and nonce > 0) not valid,
  add constraint slot_spins_round_ref_valid
    check (nullif(btrim(round_ref), '') is not null) not valid;

-- Existing rows pass these four constraints, so they can be validated now.
alter table public.slot_spins validate constraint slot_spins_amounts_valid;
alter table public.slot_spins validate constraint slot_spins_reels_valid;
alter table public.slot_spins validate constraint slot_spins_fairness_material_valid;
alter table public.slot_spins validate constraint slot_spins_payout_math_valid;

-- nonce and round_ref remain NOT VALID because two historical rows predate the
-- atomic settlement contract. PostgreSQL still enforces both constraints for
-- all new and updated rows. Legacy evidence is preserved for later backfill.

alter table public.crash_bets
  drop constraint if exists crash_bets_amounts_valid,
  drop constraint if exists crash_bets_result_valid,
  drop constraint if exists crash_bets_fairness_material_valid,
  drop constraint if exists crash_bets_ref_valid;

alter table public.crash_bets
  add constraint crash_bets_amounts_valid
    check (
      bet_amount > 0
      and payout >= 0
      and target_multiplier >= 1.01
      and crash_multiplier >= 1
    ) not valid,
  add constraint crash_bets_result_valid
    check (
      (
        did_cashout
        and target_multiplier <= crash_multiplier
        and abs(round(bet_amount * target_multiplier, 2) - round(payout, 2)) <= 0.01
      )
      or
      (
        not did_cashout
        and target_multiplier > crash_multiplier
        and round(payout, 2) = 0
      )
    ) not valid,
  add constraint crash_bets_fairness_material_valid
    check (
      server_seed_hash ~ '^[0-9a-f]{64}$'
      and nullif(btrim(server_seed), '') is not null
    ) not valid,
  add constraint crash_bets_ref_valid
    check (nullif(btrim(ref_id), '') is not null) not valid;

alter table public.crash_bets validate constraint crash_bets_amounts_valid;
alter table public.crash_bets validate constraint crash_bets_result_valid;
alter table public.crash_bets validate constraint crash_bets_fairness_material_valid;
alter table public.crash_bets validate constraint crash_bets_ref_valid;

commit;
