-- Close the unused legacy client-write path on public.bets.
-- Active casino wagers are handled by server-side atomic settlement RPCs.
-- This migration preserves the table and authenticated owner reads.

drop policy if exists "User Insert Bets" on public.bets;
revoke insert on table public.bets from anon, authenticated;
