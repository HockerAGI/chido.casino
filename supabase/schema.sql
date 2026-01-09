-- =========================================================
-- CHIDO CASINO — SUPABASE SCHEMA (SECURE & PROD READY)
-- =========================================================

create extension if not exists pgcrypto;

-- 1. TABLAS
create table if not exists public.balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null check (amount > 0),
  status text not null check (status in ('pending','completed','failed','canceled')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 2. TRIGGERS Y FUNCIONES DE UTILIDAD

-- Helper para actualizar timestamps
create or replace function public.set_updated_at()
returns trigger 
language plpgsql
-- FIJADO DE SEARCH_PATH PARA SEGURIDAD
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_balances_updated_at on public.balances;
create trigger trg_balances_updated_at
before update on public.balances
for each row execute function public.set_updated_at();

-- Auto-crear balance al registrar usuario
create or replace function public.handle_new_user_balance()
returns trigger 
language plpgsql 
security definer
-- FIJADO DE SEARCH_PATH PARA SEGURIDAD
set search_path = public
as $$
begin
  insert into public.balances (user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created_balance on auth.users;
create trigger on_auth_user_created_balance
after insert on auth.users
for each row execute function public.handle_new_user_balance();

-- 3. RPC ATÓMICO PARA DEPÓSITOS
create or replace function public.confirm_deposit(p_session_id text, p_payment_intent_id text default null)
returns void
language plpgsql
security definer
-- FIJADO DE SEARCH_PATH PARA SEGURIDAD
set search_path = public
as $$
declare
  tx record;
begin
  if p_session_id is null or length(p_session_id) = 0 then
    return;
  end if;

  -- Bloquear fila para evitar race conditions
  select * into tx from public.transactions
  where stripe_checkout_session_id = p_session_id
  for update;

  if not found or tx.status = 'completed' then
    return;
  end if;

  -- Marcar completada
  update public.transactions
  set status = 'completed',
      stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
      completed_at = now()
  where id = tx.id;

  -- Incrementar balance
  insert into public.balances (user_id, balance)
  values (tx.user_id, tx.amount)
  on conflict (user_id)
  do update set balance = public.balances.balance + excluded.balance;
end;
$$;

-- 4. SEGURIDAD (RLS)
alter table public.balances enable row level security;
alter table public.transactions enable row level security;

-- Políticas de lectura (Solo el dueño ve sus datos)
drop policy if exists "balances_select_own" on public.balances;
create policy "balances_select_own" on public.balances for select using (auth.uid() = user_id);

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);

-- 5. REALTIME
alter publication supabase_realtime add table public.balances;

-- 6. LIMPIEZA (Opcional: Elimina la función vieja que causa advertencia si existe)
drop function if exists public.handle_new_user() cascade;