# CHIDO Launch Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship CHIDO as a launch-quality, fully functional DEMO product where account, profile, lobby, promotions, loyalty, responsible gaming, support and CHIDO Originals work against isolated demo credits, while every real-money path stays fail-closed.

**Architecture:** Keep `HockerAGI/chido.casino` as the product/runtime boundary for identity, UI, demo ledger, responsible-gaming, provider adapters and release controls. Add a server-authoritative `demo` runtime mode and a completely separate demo-credit ledger/RPC surface; do not route demo gameplay through real `balances`, `transactions`, `deposit_intents`, `withdraw_requests`, payment providers or the existing real-money settlement RPCs. The later CHIDO game-development laboratory lives in a separate repository because its simulation/certification/asset/release lifecycle differs from the regulated casino app.

**Tech Stack:** Next.js 16.2.x, React 19.2.x, TypeScript 5.9.x, Tailwind 3.4.x, Node 24.x, Supabase/Postgres 17, Vercel, existing `node:test` test harness, existing Supabase SSR helpers, existing Lucide UI system.

## Global Constraints

- Runtime mode for this release is **`demo` only**. `regulated` exists as a typed future state but MUST fail closed unless the existing legal/payment/system-control gates are satisfied.
- Persistent user-facing copy: **`DEMO · SIN DINERO REAL · +18`** on all gaming/wallet surfaces.
- No production deposit, withdrawal, payout, cashable affiliate commission, payment-provider call or real-money game settlement may be reachable from DEMO UI/API paths.
- Preserve the existing `system_controls(project_id='chido-casino', id='chido-casino-games')` fail-closed record. Do not relax its `kill_switch=true` / `allow_write=false` regulatory role.
- Demo credits are **non-cashable product credits**, never MXN. Store them as integer minor units (`amount_minor bigint`, 100 minor = 1 demo credit) and display them as `CR DEMO`, not currency.
- Do not rotate credentials in this release. Do not copy credential values from documents into source, logs, tests, issues, PRs or client bundles.
- Public DEMO KYC does not accept real identity documents. Internal QA may use synthetic fixtures only.
- Preserve existing CHIDO logo and icon source masters. New/optimized delivery derivatives are allowed. Other current heavy imagery may be replaced.
- DEMO keeps `noindex`, `nofollow`, `noarchive`, `nosnippet` and current security headers.
- Self-exclusion and responsible-gaming restrictions apply to demo gameplay.
- Do not upgrade Tailwind 3→4 or TypeScript 5→7 in this project slice.
- Every behavioral change uses RED → GREEN → REFACTOR and ends with focused tests plus `npm run verify` at review gates.

---

## File/Responsibility Map

### New runtime/demo domain
- `src/lib/chidoRuntimeMode.ts` — server-only runtime mode parsing and safe public projection.
- `src/lib/demoCredits.ts` — demo-credit conversion/format helpers; no database access.
- `src/lib/demoWallet.ts` — authenticated demo-wallet/RPC adapter used by API/game routes.
- `src/app/api/demo/status/route.ts` — safe public runtime status.
- `src/app/api/demo/wallet/route.ts` — current demo balance + paginated ledger.
- `src/app/api/demo/wallet/top-up/route.ts` — idempotent non-cashable demo-credit refill.
- `src/app/api/demo/wallet/withdraw-preview/route.ts` — validates UX request and returns an explicit simulated/non-monetary state without writing financial tables.
- `src/app/api/demo/games/taco-slot/spin/route.ts` — demo-only Taco settlement.
- `src/app/api/demo/games/crash/play/route.ts` — demo-only Crash settlement.

### New shared UI
- `src/components/demo/DemoStatusBar.tsx` — persistent DEMO disclosure.
- `src/components/demo/DemoBalance.tsx` — reusable demo-credit balance display.
- `src/components/lobby/GameRail.tsx` — reusable horizontal game row.
- `src/components/lobby/GameCard.tsx` — game card with DEMO/coming-soon states.
- `src/components/lobby/LobbySearch.tsx` — interactive search/filter UI.

### Database
- `supabase/migrations/20260812_000001_chido_demo_ledger.sql` — isolated demo wallets, ledger, rounds, RLS and atomic RPCs.
- `supabase/migrations/20260812_000002_chido_demo_game_settlement.sql` — idempotent Taco/Crash demo settlement RPCs and restricted grants.

### Tests
- `tests/demo-runtime-mode.test.mjs`
- `tests/demo-ledger-isolation.test.mjs`
- `tests/demo-game-settlement.test.mjs`
- `tests/demo-payment-isolation.test.mjs`
- `tests/demo-ui-disclosure.test.mjs`
- `tests/demo-pwa-cache-boundary.test.mjs`

### Existing files intentionally modified
- `.env.example`
- `src/app/.env.example`
- `src/app/layout.tsx`
- `src/app/_components/AppShell.tsx`
- `src/components/layout/main-layout.tsx`
- `src/app/page.tsx`
- `src/app/lobby/page.tsx`
- `src/lib/games.ts`
- `src/app/api/profile/bootstrap/route.ts`
- `src/app/wallet/page.tsx`
- `src/app/wallet/wallet-client.tsx`
- `src/app/games/taco-slot/page.tsx`
- `src/app/games/crash/page.tsx`
- `src/app/profile/kyc/page.tsx` (or the existing page inside that route directory)
- `public/manifest.json`
- `public/sw.js`
- `README.md`

---

### Task 1: Lock the DEMO Runtime Contract

**Files:**
- Create: `src/lib/chidoRuntimeMode.ts`
- Create: `src/app/api/demo/status/route.ts`
- Create: `tests/demo-runtime-mode.test.mjs`
- Modify: `.env.example`
- Modify: `src/app/.env.example`

**Interfaces:**
- Produces: `type ChidoRuntimeMode = "demo" | "regulated"`
- Produces: `getChidoRuntimeMode(): ChidoRuntimeMode`
- Produces: `isDemoMode(): boolean`
- Produces: `publicChidoRuntimeStatus(): { mode: "demo" | "regulated"; realMoneyEnabled: boolean; label: string }`
- Invariant: unknown/missing env values return `demo`; `realMoneyEnabled` is always `false` from this slice.

- [ ] **Step 1: Write the failing runtime-contract test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("runtime mode is fail-closed and exposes a DEMO public projection", async () => {
  const source = await read("src/lib/chidoRuntimeMode.ts");
  assert.match(source, /type ChidoRuntimeMode = "demo" \| "regulated"/);
  assert.match(source, /return "demo"/);
  assert.match(source, /realMoneyEnabled:\s*false/);
  assert.match(source, /DEMO · SIN DINERO REAL · \+18/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/demo-runtime-mode.test.mjs`
Expected: FAIL because `src/lib/chidoRuntimeMode.ts` does not exist.

- [ ] **Step 3: Implement the minimal server contract**

```ts
export type ChidoRuntimeMode = "demo" | "regulated";

export function getChidoRuntimeMode(): ChidoRuntimeMode {
  return process.env.CHIDO_RUNTIME_MODE === "regulated" ? "regulated" : "demo";
}

export function isDemoMode() {
  return getChidoRuntimeMode() === "demo";
}

export function publicChidoRuntimeStatus() {
  return {
    mode: getChidoRuntimeMode(),
    realMoneyEnabled: false,
    label: "DEMO · SIN DINERO REAL · +18",
  } as const;
}
```

`GET /api/demo/status` returns only `publicChidoRuntimeStatus()` with `Cache-Control: no-store`.

- [ ] **Step 4: Document only the non-secret variable**

Add `CHIDO_RUNTIME_MODE=demo` to both env examples. Do not add credentials.

- [ ] **Step 5: Run tests and commit**

Run: `node --test tests/demo-runtime-mode.test.mjs && npm run typecheck && npm run lint`
Expected: PASS.

Commit: `feat(demo): add fail-closed runtime mode`

---

### Task 2: Create the Isolated Demo Ledger

**Files:**
- Create: `supabase/migrations/20260812_000001_chido_demo_ledger.sql`
- Create: `tests/demo-ledger-isolation.test.mjs`
- Modify: `tests/security-definer-boundaries.test.mjs` only if a new privileged RPC is intentionally added.

**Interfaces:**
- Tables:
  - `public.chido_demo_wallets(user_id uuid primary key, balance_minor bigint not null, created_at timestamptz, updated_at timestamptz)`
  - `public.chido_demo_ledger_entries(id uuid primary key, user_id uuid not null, idempotency_key text not null, entry_type text not null, amount_minor bigint not null, balance_after_minor bigint not null, game_key text null, round_ref text null, metadata jsonb not null, created_at timestamptz)`
  - `public.chido_demo_rounds(id uuid primary key, user_id uuid not null, game_key text not null, round_ref text not null, wager_minor bigint not null, payout_minor bigint not null, result jsonb not null, fairness_commitment text null, created_at timestamptz)`
- Unique: `(user_id, idempotency_key)` on ledger and `(user_id, round_ref)` on rounds.
- RPC: `public.chido_demo_grant_welcome(p_user_id uuid, p_idempotency_key text) returns jsonb`
- RPC: `public.chido_demo_apply_delta(p_user_id uuid, p_amount_minor bigint, p_entry_type text, p_idempotency_key text, p_game_key text default null, p_round_ref text default null, p_metadata jsonb default '{}'::jsonb) returns jsonb`

- [ ] **Step 1: Write the failing migration-contract test**

```js
test("demo ledger is structurally isolated from production money tables", async () => {
  const sql = await read("supabase/migrations/20260812_000001_chido_demo_ledger.sql");
  assert.match(sql, /create table[^;]+chido_demo_wallets/is);
  assert.match(sql, /create table[^;]+chido_demo_ledger_entries/is);
  assert.match(sql, /balance_minor\s+bigint/i);
  assert.match(sql, /enable row level security/i);
  assert.doesNotMatch(sql, /update\s+(public\.)?balances\b/i);
  assert.doesNotMatch(sql, /insert\s+into\s+(public\.)?transactions\b/i);
  assert.doesNotMatch(sql, /deposit_intents|withdraw_requests/i);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/demo-ledger-isolation.test.mjs`
Expected: FAIL because migration does not exist.

- [ ] **Step 3: Implement tables, constraints and indexes**

Use `bigint` minor units, `CHECK (balance_minor >= 0)`, `CHECK (amount_minor <> 0)`, UTC timestamps, foreign keys to `auth.users(id)` where existing migration conventions allow it, and indexes on `(user_id, created_at desc)` / `(game_key, created_at desc)`.

- [ ] **Step 4: Implement RLS**

Authenticated users may `SELECT` only their own demo wallet/ledger/round rows. Client roles receive no direct `INSERT/UPDATE/DELETE`. All mutation goes through restricted backend RPC/service identity.

- [ ] **Step 5: Implement atomic idempotent credit helpers**

`chido_demo_apply_delta` locks the wallet row (`FOR UPDATE`), rejects negative resulting balances, inserts one ledger row, and returns the existing entry on repeated `(user_id,idempotency_key)`.

Welcome grant uses idempotency key `welcome:v1:<user_id>` and adds exactly `1_000_000` minor units = `10,000 CR DEMO` once.

- [ ] **Step 6: Run migration tests and commit**

Run: `node --test tests/demo-ledger-isolation.test.mjs tests/security-definer-boundaries.test.mjs`
Expected: PASS.

Commit: `feat(db): add isolated Chido demo ledger`

---

### Task 3: Add the Demo Wallet Server Adapter and APIs

**Files:**
- Create: `src/lib/demoCredits.ts`
- Create: `src/lib/demoWallet.ts`
- Create: `src/app/api/demo/wallet/route.ts`
- Create: `src/app/api/demo/wallet/top-up/route.ts`
- Create: `src/app/api/demo/wallet/withdraw-preview/route.ts`
- Create: `tests/demo-payment-isolation.test.mjs`

**Interfaces:**
- `formatDemoCredits(minor: number): string`
- `getDemoWallet(userId: string): Promise<{ balanceMinor: number; balanceCredits: number }>`
- `grantDemoWelcome(userId: string): Promise<DemoWalletResult>`
- `topUpDemoCredits(userId: string, idempotencyKey: string, amountMinor: number): Promise<DemoWalletResult>`
- `/api/demo/wallet` -> `{ ok:true, unit:"CR_DEMO", balanceMinor, entries }`
- `/api/demo/wallet/top-up` accepts fixed presets only: 1000, 5000 or 10000 credits.
- `/api/demo/wallet/withdraw-preview` -> `{ ok:true, simulated:true, monetaryValue:false, status:"DEMO_ONLY" }` and performs no DB financial mutation.

- [ ] **Step 1: Write isolation tests before implementation**

```js
test("demo wallet API cannot invoke production payment or money tables", async () => {
  const files = [
    "src/app/api/demo/wallet/route.ts",
    "src/app/api/demo/wallet/top-up/route.ts",
    "src/app/api/demo/wallet/withdraw-preview/route.ts",
    "src/lib/demoWallet.ts",
  ];
  const source = (await Promise.all(files.map(read))).join("\n");
  assert.doesNotMatch(source, /mercadopago|stripe/i);
  assert.doesNotMatch(source, /deposit_intents|withdraw_requests/i);
  assert.doesNotMatch(source, /from\(["']balances["']\)|from\(["']transactions["']\)/i);
  assert.match(source, /chido_demo_/i);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/demo-payment-isolation.test.mjs`
Expected: FAIL because files do not exist.

- [ ] **Step 3: Implement authentication and adapter**

Use `getServerSession(req)` for API routes and `supabaseAdmin.rpc(...)` only behind server code. Reject unauthenticated requests with 401.

- [ ] **Step 4: Implement safe top-up semantics**

Allow only `100_000`, `500_000`, `1_000_000` minor units per request, require an `Idempotency-Key`, and write `entry_type='demo_top_up'`. No card/provider UI or provider API.

- [ ] **Step 5: Implement withdrawal preview with zero side effects**

Validate a positive requested credit amount and return the explicit DEMO_ONLY response. No insert into demo ledger is needed because a non-cashable withdrawal should not actually remove credits.

- [ ] **Step 6: Run tests and commit**

Run: `node --test tests/demo-payment-isolation.test.mjs && npm run typecheck && npm run lint`
Expected: PASS.

Commit: `feat(demo): add isolated demo wallet APIs`

---

### Task 4: Grant Welcome Credits During Real Account Bootstrap

**Files:**
- Modify: `src/app/api/profile/bootstrap/route.ts`
- Test: `tests/demo-onboarding.test.mjs`

**Interfaces:**
- Consumes: `isDemoMode()`, `grantDemoWelcome(userId)`
- Produces bootstrap envelope addition: `demo?: { balanceMinor:number; unit:"CR_DEMO" }`

- [ ] **Step 1: Write a failing static/behavioral contract test**

```js
test("profile bootstrap grants idempotent demo welcome credits without touching real balance", async () => {
  const source = await read("src/app/api/profile/bootstrap/route.ts");
  assert.match(source, /grantDemoWelcome/);
  assert.match(source, /isDemoMode/);
  assert.doesNotMatch(source, /from\(["']balances["']\)/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/demo-onboarding.test.mjs`
Expected: FAIL because bootstrap does not call the demo grant.

- [ ] **Step 3: Integrate after successful profile create/update**

In DEMO mode only, call `grantDemoWelcome(userId)` after profile persistence succeeds. The RPC is idempotent, so existing users also get exactly one welcome grant when they first enter DEMO.

- [ ] **Step 4: Preserve age/terms/privacy gates exactly**

Do not weaken `adultDate`, `termsAcceptedAt` or `privacyAcceptedAt` requirements.

- [ ] **Step 5: Run tests and commit**

Run: `node --test tests/demo-onboarding.test.mjs && npm run typecheck && npm run lint`
Expected: PASS.

Commit: `feat(demo): grant welcome credits at onboarding`

---

### Task 5: Add the Persistent DEMO Disclosure and Navigation Shell

**Files:**
- Create: `src/components/demo/DemoStatusBar.tsx`
- Modify: `src/app/_components/AppShell.tsx`
- Modify: `src/components/layout/main-layout.tsx`
- Modify: `src/app/layout.tsx`
- Create: `tests/demo-ui-disclosure.test.mjs`

**Interfaces:**
- `DemoStatusBar({ compact?: boolean })`
- Text exactly: `DEMO · SIN DINERO REAL · +18`

- [ ] **Step 1: Write disclosure tests**

```js
test("DEMO disclosure is mounted at the root shell", async () => {
  const shell = await read("src/app/_components/AppShell.tsx");
  const bar = await read("src/components/demo/DemoStatusBar.tsx");
  assert.match(shell, /DemoStatusBar/);
  assert.match(bar, /DEMO · SIN DINERO REAL · \+18/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/demo-ui-disclosure.test.mjs`
Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement one slim persistent disclosure**

Place it above both the no-shell public home/auth surfaces and authenticated `MainLayout` content. Keep it visually prominent enough to avoid confusion but not as the hero message.

- [ ] **Step 4: Keep metadata explicitly DEMO/noindex**

Update title/description from “technical preview” language to launch-preview language while retaining the current robots denial. Do not make gambling/licensing claims.

- [ ] **Step 5: Run tests and commit**

Run: `node --test tests/demo-ui-disclosure.test.mjs && npm run typecheck && npm run lint`
Expected: PASS.

Commit: `feat(ui): add persistent Chido demo disclosure`

---

### Task 6: Build the Launch-Quality Home and Lobby Information Architecture

**Files:**
- Create: `src/components/lobby/GameCard.tsx`
- Create: `src/components/lobby/GameRail.tsx`
- Create: `src/components/lobby/LobbySearch.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/lobby/page.tsx`
- Modify: `src/lib/games.ts`
- Test: `tests/demo-lobby-contract.test.mjs`

**Interfaces:**
- `GameCard({ game, mode:"demo" })`
- `GameRail({ title, games })`
- `LobbySearch({ games, onResults })`
- `Game` adds optional `art?: { card:string; hero?:string }` and `demoPlayable:boolean`.

- [ ] **Step 1: Create a failing content/architecture test**

```js
test("lobby is entertainment-first and does not lead with audit copy", async () => {
  const home = await read("src/app/page.tsx");
  const lobby = await read("src/app/lobby/page.tsx");
  assert.match(home, /JUEGA CHIDO/i);
  assert.match(lobby, /CHIDO ORIGINALS/i);
  assert.match(lobby, /LobbySearch/);
  assert.doesNotMatch(home, /Prelaunch técnico/i);
  assert.doesNotMatch(lobby, /Dos motores en preview/i);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/demo-lobby-contract.test.mjs`
Expected: FAIL on current technical-prelaunch copy.

- [ ] **Step 3: Implement the approved IA**

Home first viewport: existing CHIDO logo, headline `JUEGA CHIDO.`, short demo-safe value proposition, CTA `ENTRAR AL LOBBY`, secondary `CREAR CUENTA`.

Lobby order:
1. Campaign/CHIDO Originals hero.
2. Search + category controls.
3. `CHIDO ORIGINALS` rail.
4. `PARA TI` only when personalized data exists; otherwise omit rather than fake.
5. `NUEVOS` / category rails generated from actual `GAMES` data.
6. Provider section only when actual provider catalog exists; do not fake provider logos.

- [ ] **Step 4: Remove emoji as card primary art**

Keep `emoji` temporarily as an accessible/text fallback only. Cards must prefer `game.art.card` or a deliberate branded fallback surface. Do not fabricate external game art.

- [ ] **Step 5: Apply React performance constraints**

Keep static content server-rendered where possible, isolate search/filter to a small client component, avoid moving the entire lobby to a client component, and lazy-load large below-fold art.

- [ ] **Step 6: Run tests and commit**

Run: `node --test tests/demo-lobby-contract.test.mjs && npm run typecheck && npm run lint`
Expected: PASS.

Commit: `feat(lobby): redesign Chido launch preview`

---

### Task 7: Rebuild Wallet UX Around Demo Credits Only

**Files:**
- Modify: `src/app/wallet/page.tsx`
- Modify: `src/app/wallet/wallet-client.tsx`
- Do not render in DEMO: `src/app/wallet/mercadopago-payment-brick.tsx`
- Create: `src/components/demo/DemoBalance.tsx`
- Test: `tests/demo-wallet-ui.test.mjs`

**Interfaces:**
- Wallet fetches `/api/demo/wallet`.
- Top-up uses `/api/demo/wallet/top-up`.
- “Retiro” opens a preview flow and posts to `/api/demo/wallet/withdraw-preview`.

- [ ] **Step 1: Write failing UI isolation test**

```js
test("wallet DEMO UI never renders a production payment brick", async () => {
  const page = await read("src/app/wallet/wallet-client.tsx");
  assert.match(page, /\/api\/demo\/wallet/);
  assert.match(page, /CR DEMO/);
  assert.doesNotMatch(page, /MercadoPagoPaymentBrick/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/demo-wallet-ui.test.mjs`
Expected: FAIL because current wallet is production-payment oriented.

- [ ] **Step 3: Implement final-looking demo wallet**

Sections: current balance, `RECARGAR CRÉDITOS DEMO`, `SIMULAR RETIRO`, ledger/history, promo/bonus summary. Explicit line: `Los créditos DEMO no tienen valor monetario y no pueden retirarse.`

- [ ] **Step 4: Keep production payment component present but unreachable**

Do not delete Mercado Pago code in this slice. It remains gated for a future regulated release and must not be imported by the DEMO wallet bundle.

- [ ] **Step 5: Run tests and commit**

Run: `node --test tests/demo-wallet-ui.test.mjs tests/demo-payment-isolation.test.mjs && npm run typecheck && npm run lint`
Expected: PASS.

Commit: `feat(wallet): switch public Chido wallet to demo credits`

---

### Task 8: Add Atomic Demo Taco Slot Settlement

**Files:**
- Create: `supabase/migrations/20260812_000002_chido_demo_game_settlement.sql`
- Create: `src/app/api/demo/games/taco-slot/spin/route.ts`
- Modify: `src/app/games/taco-slot/page.tsx`
- Create/Modify: `tests/demo-game-settlement.test.mjs`

**Interfaces:**
- RPC: `chido_demo_settle_round(p_user_id, p_game_key, p_round_ref, p_wager_minor, p_payout_minor, p_result, p_fairness_commitment, p_idempotency_key) returns jsonb`
- Demo endpoint accepts `{ wagerCredits:number, clientSeed?:string, requestId:string }`.
- Demo endpoint returns `{ ok, roundRef, wagerCredits, payoutCredits, multiplier, reels, balanceCredits, fair:{ commitment, nonce } }`.
- It MUST NOT return the active `serverSeed` before a defined reveal/replay point.

- [ ] **Step 1: Write failing settlement-boundary tests**

```js
test("demo Taco settlement uses only demo RPC and hides active server seed", async () => {
  const source = await read("src/app/api/demo/games/taco-slot/spin/route.ts");
  assert.match(source, /chido_demo_settle_round/);
  assert.doesNotMatch(source, /casino_settle_taco_slot/);
  assert.doesNotMatch(source, /from\(["']slot_spins["']\)/);
  assert.doesNotMatch(source, /serverSeed:\s*serverSeed/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/demo-game-settlement.test.mjs`
Expected: FAIL because demo route does not exist.

- [ ] **Step 3: Implement atomic SQL settlement**

Within one transaction/function: validate user UUID, lock demo wallet, verify sufficient demo credits, enforce unique round/idempotency, insert one round, insert debit ledger row, insert payout ledger row only when payout > 0, update balance, return final balance/round. Restrict execution to server-trusted role according to existing migration conventions.

- [ ] **Step 4: Implement Taco demo route**

Reuse deterministic/fair primitives from `src/lib/provablyFair.ts`, existing symbol weights/math for this preview, and self-exclusion checks. Do **not** call `assertGamesNotPaused()` because that guard intentionally protects real-money gameplay; instead require `isDemoMode()` and use demo settlement only.

- [ ] **Step 5: Point Taco UI to demo API**

Replace current MXN/balance hooks with demo wallet balance and `CR DEMO`. Preserve animation; update idempotency request handling.

- [ ] **Step 6: Run tests and commit**

Run: `node --test tests/demo-game-settlement.test.mjs tests/prelaunch-db-control.test.mjs tests/game-settlement-hardening.test.mjs && npm run typecheck && npm run lint`
Expected: all PASS, including original fail-closed tests.

Commit: `feat(games): enable Taco Slot with isolated demo credits`

---

### Task 9: Add Atomic Demo Chido Crash Settlement

**Files:**
- Create: `src/app/api/demo/games/crash/play/route.ts`
- Modify: `src/app/games/crash/page.tsx`
- Modify: `tests/demo-game-settlement.test.mjs`

**Interfaces:**
- Uses the same `chido_demo_settle_round` RPC.
- Request: `{ wagerCredits:number, targetMultiplier:number, clientSeed?:string, requestId:string }`.
- Response: `{ ok, roundRef, crashMultiplier, targetMultiplier, didCashout, payoutCredits, balanceCredits, fair:{ commitment, nonce } }`.

- [ ] **Step 1: Add a failing Crash isolation test**

```js
test("demo Crash never invokes production crash settlement", async () => {
  const source = await read("src/app/api/demo/games/crash/play/route.ts");
  assert.match(source, /chido_demo_settle_round/);
  assert.doesNotMatch(source, /casino_settle_crash|crash_bets/);
  assert.doesNotMatch(source, /assertGamesNotPaused/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/demo-game-settlement.test.mjs`
Expected: FAIL on missing route.

- [ ] **Step 3: Implement server-authoritative result and settlement**

Reuse existing Crash math/fairness primitives, validate target boundaries, check self-exclusion, settle only demo credits, return commitment/replay-safe data.

- [ ] **Step 4: Update Crash UI**

Use demo balance and credits, preserve current Canvas animation, remove MXN wording, and keep the server result as the only outcome authority.

- [ ] **Step 5: Run tests and commit**

Run: `node --test tests/demo-game-settlement.test.mjs tests/prelaunch-db-control.test.mjs tests/game-settlement-hardening.test.mjs && npm run typecheck && npm run lint`
Expected: PASS.

Commit: `feat(games): enable Chido Crash with isolated demo credits`

---

### Task 10: Preserve Responsible-Gaming Controls in DEMO

**Files:**
- Modify only as needed: `src/lib/responsibleGaming.ts`
- Verify existing: `src/app/api/responsible/status/route.ts`
- Verify existing: `src/app/api/responsible/self-exclude/route.ts`
- Modify: Taco/Crash demo routes from Tasks 8–9
- Test: `tests/demo-responsible-gaming.test.mjs`

**Interfaces:**
- Demo game routes return 403 `{ error:"SELF_EXCLUDED" }` when excluded.
- Exclusion state is shared product safety state, not duplicated in demo tables.

- [ ] **Step 1: Write failing safety test**

```js
test("both demo game routes enforce the existing self-exclusion service", async () => {
  for (const path of [
    "src/app/api/demo/games/taco-slot/spin/route.ts",
    "src/app/api/demo/games/crash/play/route.ts",
  ]) {
    const source = await read(path);
    assert.match(source, /getSelfExclusionState/);
    assert.match(source, /SELF_EXCLUDED/);
  }
});
```

- [ ] **Step 2: Verify RED if either route is missing the check**

Run: `node --test tests/demo-responsible-gaming.test.mjs`
Expected: FAIL until both routes enforce it.

- [ ] **Step 3: Implement/fix and verify GREEN**

Run: `node --test tests/demo-responsible-gaming.test.mjs`
Expected: PASS.

- [ ] **Step 4: Commit**

Commit: `test(safety): enforce responsible gaming in demo`

---

### Task 11: Make Promotions/Loyalty Real Product State but Non-Cashable

**Files:**
- Inspect/modify actual existing promotion routes under `src/app/api/promos/`
- Modify any public promo/loyalty UI routes that currently quote MXN or cashable rewards.
- Create: `src/lib/demoRewards.ts`
- Test: `tests/demo-rewards-boundary.test.mjs`

**Interfaces:**
- `DemoReward = { kind:"demo_credits" | "free_rounds" | "xp"; amount:number; cashable:false }`
- Existing active-window, claim/idempotency, streak and visibility rules stay authoritative.
- When a reward is financial in production, DEMO maps it to non-cashable demo credits through `chido_demo_apply_delta`.

- [ ] **Step 1: Write failing boundary test**

```js
test("demo rewards are explicitly non-cashable and use the demo ledger", async () => {
  const source = await read("src/lib/demoRewards.ts");
  assert.match(source, /cashable:\s*false/);
  assert.match(source, /demo_credits/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/demo-rewards-boundary.test.mjs`
Expected: FAIL because helper does not exist.

- [ ] **Step 3: Implement the mapping without changing production promo schema semantics**

Do not rewrite real-money promo tables into demo tables. Treat the offer/claim as product entitlement state; only the credited value uses the demo ledger in DEMO mode.

- [ ] **Step 4: Preserve active-window security regression**

Run: `node --test tests/promo-offer-public-visibility.test.mjs tests/demo-rewards-boundary.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `feat(promos): map demo rewards to non-cashable credits`

---

### Task 12: Public KYC/Eligibility UX Without Real Document Collection

**Files:**
- Modify: existing `src/app/profile/kyc/*` page/client files after inspection.
- Do not change internal admin review routes except copy/labels necessary for synthetic QA.
- Test: `tests/demo-kyc-boundary.test.mjs`

**Interfaces:**
- Public DEMO state: `KYC no requerido para créditos DEMO` and `La verificación documental se habilitará para operación regulada.`
- Existing age declaration and legal consent remain required.
- No public DEMO upload call to `/api/kyc/submit`.

- [ ] **Step 1: Write a failing no-document test**

```js
test("public demo KYC does not submit identity documents", async () => {
  const files = await listKnownKycUiFiles();
  const source = (await Promise.all(files.map(read))).join("\n");
  assert.match(source, /verificación documental se habilitará/i);
  assert.doesNotMatch(source, /fetch\(["']\/api\/kyc\/submit["']/);
});
```

Implementation note: keep the test’s file list explicit after inspecting `src/app/profile/kyc/`; do not introduce filesystem glob dependencies.

- [ ] **Step 2: Verify RED**

Expected: FAIL if current public UI still submits KYC.

- [ ] **Step 3: Implement DEMO eligibility page**

Show age/legal eligibility and current internal KYC status as informational only. Keep the existing KYC API/admin implementation for future regulated activation and internal synthetic QA; do not delete it.

- [ ] **Step 4: Run tests and commit**

Run: `node --test tests/demo-kyc-boundary.test.mjs && npm run typecheck && npm run lint`
Expected: PASS.

Commit: `feat(kyc): gate document collection outside demo`

---

### Task 13: Make Support and Error Recovery Launch-Quality

**Files:**
- Inspect/modify: `src/app/support/*` if present.
- If no durable support intake exists, create migration `supabase/migrations/20260812_000003_chido_support_requests.sql` and route `src/app/api/support/route.ts`.
- Create/modify: `tests/support-intake.test.mjs`.

**Interfaces when durable intake is needed:**
- `POST /api/support` authenticated request `{ category, subject, message }`.
- Table `chido_support_requests(id,user_id,category,subject,message,status,created_at,updated_at)` with RLS owner-read and no client direct writes.
- Response returns ticket id; no promise of a response SLA not yet measured.

- [ ] **Step 1: Inspect existing support implementation and choose reuse vs minimal durable intake**

Run/read exact route files before writing test. This is a decision step based on repository evidence, not a placeholder.

- [ ] **Step 2: Write one failing test for the chosen existing/new contract**

At minimum assert auth, bounded category/subject/message lengths, user ownership and no sensitive secret logging.

- [ ] **Step 3: Verify RED, implement minimal durable behavior, verify GREEN**

Run focused test + `npm run typecheck && npm run lint`.

- [ ] **Step 4: Commit**

Commit: `feat(support): harden Chido demo support intake`

---

### Task 14: Harden PWA Cache Boundaries and Optimize Assets

**Files:**
- Modify: `public/sw.js`
- Modify: `public/manifest.json`
- Keep masters: `public/chido-logo.png`, `public/icon-192.png`, `public/icon-512.png`
- Add optimized delivery files under: `public/media/` (exact generated filenames recorded in commit)
- Create: `tests/demo-pwa-cache-boundary.test.mjs`

**Interfaces:**
- Service worker never caches `/api/`, `/auth`, `/profile`, `/wallet`, KYC, demo ledger or private HTML responses.
- Static image/script/style assets may use versioned cache.
- Navigation remains network-first with offline fallback.

- [ ] **Step 1: Write failing cache-boundary test**

```js
test("service worker excludes APIs and private account routes from cache", async () => {
  const source = await read("public/sw.js");
  assert.match(source, /pathname\.startsWith\(["']\/api\/["']\)/);
  assert.match(source, /\/wallet|\/profile|\/auth/);
  assert.match(source, /network-first|mode === "navigate"/i);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/demo-pwa-cache-boundary.test.mjs`
Expected: FAIL because current asset caching rule is too broad for the new surface.

- [ ] **Step 3: Implement explicit cache allowlist**

Cache only safe same-origin static destinations and known public assets. Return network directly for APIs and account/private paths.

- [ ] **Step 4: Optimize non-brand heavy assets**

Replace large hero/game-card artwork when beneficial. Preserve logo/icon masters; create smaller derivatives for display and reference them via `next/image`. Do not alter the visual identity of logo/icon.

- [ ] **Step 5: Run tests and commit**

Run: `node --test tests/demo-pwa-cache-boundary.test.mjs && npm run typecheck && npm run lint`
Expected: PASS.

Commit: `perf(pwa): harden cache boundaries and optimize media`

---

### Task 15: Add Final DEMO Regression Guardrails

**Files:**
- Create: `tests/demo-global-safety.test.mjs`
- Modify existing tests only when behavior was intentionally superseded; never loosen the real-money fail-closed assertions.

**Interfaces:**
- Guard all DEMO code from production PSP/financial RPC imports.
- Guard the user-visible DEMO disclosure.
- Guard current real-money system-control migration.

- [ ] **Step 1: Write global safety test**

```js
test("DEMO remains isolated while regulated game control stays fail closed", async () => {
  const realGate = await read("supabase/migrations/20260806185000_chido_prelaunch_games_fail_closed_20260810.sql");
  assert.match(realGate, /kill_switch\s*=\s*true/i);
  assert.match(realGate, /allow_write\s*=\s*false/i);

  const demoFiles = await Promise.all([
    read("src/lib/demoWallet.ts"),
    read("src/app/api/demo/games/taco-slot/spin/route.ts"),
    read("src/app/api/demo/games/crash/play/route.ts"),
  ]);
  const demoSource = demoFiles.join("\n");
  assert.doesNotMatch(demoSource, /casino_settle_|mercadopago|stripe/i);
});
```

- [ ] **Step 2: Verify test passes only after Tasks 1–14**

Run: `node --test tests/demo-global-safety.test.mjs`
Expected: PASS.

- [ ] **Step 3: Run full repository verification**

Run: `npm run verify`
Expected: all tests PASS, lint PASS, typecheck PASS, prod audit at configured severity PASS.

- [ ] **Step 4: Commit**

Commit: `test(demo): lock Chido launch preview safety boundaries`

---

### Task 16: Apply Supabase Migrations and Verify Authorization

**Files:**
- No new source beyond Tasks 2/8/13; this task executes and validates them through the Supabase connector/CLI-equivalent environment.

**Interfaces:**
- DEMO user can read own wallet/ledger/rounds only.
- Another authenticated user cannot read them.
- anon cannot read or mutate private demo state.
- client roles cannot call privileged mutation RPCs unless the intended server role contract says so.

- [ ] **Step 1: Apply migrations in the approved Supabase environment**

Apply in timestamp order and record migration versions.

- [ ] **Step 2: Run authorization probes**

Verify `anon` denied; user A sees A; user B cannot see A; direct client insert/update/delete denied; duplicate idempotency returns same result; negative balance settlement fails atomically.

- [ ] **Step 3: Run Supabase advisors/security checks**

Review RLS, grants, SECURITY DEFINER search_path/EXECUTE scopes, missing indexes and exposed objects. Any new P0/P1 caused by these migrations blocks deployment.

- [ ] **Step 4: Record evidence in PR**

Add migration IDs and advisor result summary without secrets or PII.

---

### Task 17: Create and Validate Vercel Preview

**Files:**
- No new source unless preview reveals a defect.

**Interfaces:**
- Preview must be built from exact candidate commit SHA.
- `CHIDO_RUNTIME_MODE=demo` in Preview/Production environment configuration for this release.

- [ ] **Step 1: Push candidate branch and open PR**

PR body must include: scope, DEMO boundary, real-money gate unchanged, migrations, test evidence, rollback.

- [ ] **Step 2: Wait for required GitHub `verify` status**

If failed, inspect workflow job logs; do not bypass required status.

- [ ] **Step 3: Verify Vercel deployment is `READY`**

Record deployment ID/URL and exact Git SHA.

- [ ] **Step 4: Run runtime error check**

Use Vercel runtime-errors/logs for the preview. Zero unresolved P0/P1 app errors is required.

- [ ] **Step 5: Manual/Browser product QA**

Verify desktop + mobile: home → signup/login → profile bootstrap → 10,000 CR DEMO → lobby search/category → Taco spin → Crash round → wallet ledger → top-up → simulated withdrawal → promo → self-exclusion → blocked game → support → offline fallback.

- [ ] **Step 6: Visual fidelity QA**

Compare the browser implementation against the approved Premium Dark + Mexican Neon concept. Check logo/icon fidelity, type hierarchy, first viewport, game-card art, spacing, mobile nav and the DEMO bar. Record any intentional deviations.

---

### Task 18: Production Release in DEMO Mode Only

**Files:**
- Update: `README.md` operational status section.
- Optional evidence doc: `docs/VALIDATION-20260812-CHIDO-LAUNCH-PREVIEW.md`.

**Interfaces:**
- Production remains `CHIDO_RUNTIME_MODE=demo`.
- Real-money system control remains fail closed.
- Production metadata remains noindex until a separate regulated/public launch decision.

- [ ] **Step 1: Confirm release gate**

Required evidence: `npm run verify` green, Supabase auth probes green, Vercel Preview READY, no unresolved P0/P1 runtime errors, visual/mobile QA complete.

- [ ] **Step 2: Merge through protected main**

Do not force-push or bypass required checks.

- [ ] **Step 3: Verify production deployment**

Confirm READY, exact merged SHA, DEMO banner visible, demo wallet/play works, production PSP endpoints remain unreachable from user flows.

- [ ] **Step 4: Smoke test rollback candidate**

Identify the prior production deployment and document rollback path before declaring complete.

- [ ] **Step 5: Update evidence**

Record commit, deployment, migration versions, runtime mode, tests and known deferred risks. Explicitly state: `NO REAL-MONEY OPERATION ENABLED`.

---

## Separate Subproject: CHIDO Games Lab

This is deliberately **not implemented inside the launch-preview plan** because it is a separate release/certification subsystem. Create a second plan after the repository exists.

**Repository decision:** `HockerAGI/chido-games-lab` (separate from `chido.casino`).

**Reason:** independent game-math/RNG simulation, renderer/art assets, certification evidence, reproducible game bundles, test load and lifecycle justify a distinct repository under the canonical “split only for measurable isolation/release-cycle reasons” rule.

**Initial structure:**

```text
chido-games-lab/
  packages/
    game-contracts/
    math-core/
    fairness-core/
    renderer-pixi/
  games/
    taco-slot/
    chido-crash/
  simulators/
  certification/
  assets/
  tests/
```

**Hard boundary:** no Auth database, player wallet, payment credentials or production casino secrets in the lab. `chido.casino` consumes versioned contracts/bundles only.

---

## Plugin / Connector Execution Matrix

| Capability | Use in this project |
|---|---|
| GitHub connector | Branches, files, PR, required checks, workflow evidence, code review. **Already used for this spec/plan.** |
| Supabase connector + `supabase-postgres-best-practices` | Schema/RLS/RPC design, migrations, authorization probes, advisors. **Already used to inspect current tables/system_controls; required for Tasks 2/8/16.** |
| Vercel connector | Preview/production deployments, exact SHA evidence, build/runtime errors. **Already used to verify current project/deployments; required for Tasks 17–18.** |
| `superpowers:test-driven-development` | Mandatory RED→GREEN→REFACTOR for every behavior change. |
| `build-web-apps:frontend-app-builder` | Full launch-quality home/lobby/wallet/game visual implementation; use approved visual concept before UI coding. |
| `build-web-apps:react-best-practices` | Keep server components by default, avoid waterfalls, split heavy client/game code, optimize bundles/images. |
| `build-web-apps:frontend-testing-debugging` | Browser/rendered UI regression and responsive interaction validation after implementation. |
| `superpowers:systematic-debugging` | Any failing CI, preview, runtime, Supabase or game-settlement bug. |
| `superpowers:verification-before-completion` | Required before any claim that Launch Preview is complete/ready. |
| `superpowers:requesting-code-review` | Review each material slice/PR before merge. |
| Image generation | Use for new non-logo game/hero/card art when concept implementation reaches the asset pass. Existing CHIDO logo/icon remain authoritative. |
| Figma/Canva/Adobe connectors | Not required to make the core product functional; use only if we deliberately choose an external design asset workflow. Avoid adding toolchain overhead now. |

---

## Self-Review

- **Spec coverage:** Runtime mode, demo disclosure, isolated credits, onboarding, home/lobby, wallet, Taco/Crash, responsible gaming, rewards, KYC boundary, support, PWA/assets, security regression, Supabase verification, Vercel preview and DEMO production release are each mapped to tasks.
- **Money isolation:** No task enables production deposits/withdrawals or relaxes `chido-casino-games` fail-closed controls.
- **Credential instruction:** No credential rotation is scheduled; values are never copied. The exposure/rotation risk remains explicitly deferred by owner decision.
- **Lab separation:** Captured as a separate subproject, not mixed into casino release work.
- **No dependency upgrades:** Tailwind 4 and TypeScript 7 excluded from scope.
- **No fake integrations:** External provider adapters are not marked active until contractual/technical onboarding exists.
