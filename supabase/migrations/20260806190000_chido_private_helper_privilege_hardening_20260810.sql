begin;

revoke all on function private.chido_fair_float(text, text, bigint, integer)
  from public, anon, authenticated;
revoke all on function private.enforce_deposit_intent_compliance()
  from public, anon, authenticated;
revoke all on function private.enforce_verified_adult_profile()
  from public, anon, authenticated;
revoke all on function private.validate_crash_bet_fairness()
  from public, anon, authenticated;
revoke all on function private.validate_slot_spin_fairness()
  from public, anon, authenticated;

grant execute on function private.chido_fair_float(text, text, bigint, integer)
  to service_role;
grant execute on function private.enforce_deposit_intent_compliance()
  to service_role;
grant execute on function private.enforce_verified_adult_profile()
  to service_role;
grant execute on function private.validate_crash_bet_fairness()
  to service_role;
grant execute on function private.validate_slot_spin_fairness()
  to service_role;

commit;
