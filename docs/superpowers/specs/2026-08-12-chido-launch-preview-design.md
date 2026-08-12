# CHIDO Launch Preview Design

**Date:** 2026-08-12
**Status:** APPROVED DIRECTION / implementation pending
**Owner:** HOCKER / Chido Casino
**Source of truth:** production/configuration > `main` > executable contracts/tests > canonical HOCKER docs.

## 1. Goal

Convert `chido.casino` from a technical prelaunch surface into a launch-quality casino preview where every non-monetary flow is real and testable, while all real-money movement remains impossible. The public product must look and behave like the intended launch product, with a persistent and unambiguous `DEMO · SIN DINERO REAL · +18` notice.

## 2. Non-negotiable boundaries

- **Real money stays disabled.** No production deposits, withdrawals, payouts, cashable affiliate commissions, or real-money settlement.
- Keep the existing `chido-casino-games` regulatory fail-closed control for real-money gaming. Do not repurpose that control to unlock demo play.
- Do not rotate credentials in this release. Do not copy secret values from documents into code, logs, PRs, issues, prompts, or client bundles.
- Public demo KYC must not solicit real identity documents. The KYC engine may remain functional for internal QA with synthetic documents; public users get age declaration/status UX only until the regulated launch gate passes.
- Existing logo and icon identity is preserved. Master files remain untouched; optimized delivery derivatives may be generated.
- `noindex/nofollow` remains active in DEMO mode. A separate future launch switch may enable canonical indexing only after legal/market launch approval.

## 3. Runtime modes

Introduce one server-authoritative runtime mode:

```ts
type ChidoRuntimeMode = "demo" | "regulated";
```

`demo` is the only mode enabled by this release. `regulated` must continue to require the existing legal/payment/system-control gates and is not enabled by this project.

Public UI reads a safe projection of the mode; security decisions are always server-side.

## 4. Demo financial isolation

Do **not** use production-facing `balances`, `transactions`, `deposit_intents`, or `withdraw_requests` as the source of truth for demo credits.

Create an isolated demo ledger:

- `demo_wallets(user_id, balance_credits, updated_at)`
- `demo_ledger_entries(id, user_id, amount_credits, entry_type, game_key, round_ref, metadata, created_at)`
- `demo_game_rounds(id, user_id, game_key, wager_credits, payout_credits, result, fairness_commitment, created_at)`

Rules:

- Credits are explicitly non-cashable.
- New verified demo account receives an idempotent welcome grant (default 10,000 demo credits).
- Game APIs in demo mode debit/credit only the demo ledger.
- Real-money tables and payment webhooks are never called by demo gameplay.
- Demo withdrawal/deposit screens are UX simulators only and must return explicit non-monetary states.

## 5. Product surface to activate

### Public/account
- Home, login, registration, email auth, password recovery.
- Adult age declaration and terms/privacy acceptance.
- Profile, avatar, preferences, leaderboard opt-in where already supported.
- Persistent DEMO banner/status in authenticated and unauthenticated layouts.

### Lobby
- Commercial launch-style layout: hero campaign, search, categories, CHIDO Originals, popular/new rows, recently played/favorites when data exists.
- Remove audit-first language from the primary UX. Compliance remains accessible in legal/help surfaces.
- Cards show `DEMO` or `PRÓXIMAMENTE`, never claims of certification that do not exist.

### Wallet/loyalty/promotions
- Demo balance, demo ledger history, demo top-up, simulated withdrawal flow, bonuses/free rounds/cashback/streak mechanics expressed only in demo credits.
- Promotions use real active-window logic and real entitlement rules but cannot create monetary value.
- VIP/XP and loyalty progression remain real product state but non-cashable in demo.

### Games
- Taco Slot and Chido Crash become playable against the isolated demo ledger.
- Existing server-authoritative result generation remains authoritative; UI only renders results.
- Responsible-gaming/self-exclusion gates apply to demo play too.
- Fairness/history surfaces expose safe commitments/replay data, never unrevealed seed material.

### Support/responsible gaming/admin
- Support page and real issue/contact intake where implemented; otherwise add a minimal audited support request store.
- Self-exclusion and responsible-gaming controls remain functional.
- Admin/KYC review screens remain internal-only and may use synthetic QA data.

### PWA/performance
- Preserve installability/offline shell.
- Never cache authenticated API responses, KYC, financial/demo-ledger APIs, or private user data.
- Optimize heavy images; preserve original CHIDO logo/icon masters and deliver smaller derivatives.

## 6. Visual direction

Use **Premium Dark + Mexican Neon**:

- black/deep navy base;
- CHIDO pink/cyan/green/orange used as hierarchy accents, not simultaneous full-screen noise;
- mobile-first card rows, strong game imagery, short copy;
- commercial entertainment-first navigation;
- no emoji as final flagship game art once replacement assets are ready.

Existing hero/badges may be replaced if better assets are produced. The logo/icon are mandatory identity anchors.

## 7. CHIDO game laboratory architecture

**Decision: separate repository is recommended:** `HockerAGI/chido-games-lab`.

This separation is justified by a distinct release/certification lifecycle, simulation workloads, math/RNG evidence, asset pipelines, security boundaries, and eventual provider-style packaging. It is not a separate casino backend and must not hold player money or production credentials.

Proposed structure:

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

`chido.casino` consumes immutable/versioned game contracts and web bundles/packages. Production account, auth, demo ledger, responsible-gaming, routing and provider adapters stay in `chido.casino`.

Until the new repository exists, do not duplicate the lab inside production code beyond minimal shared interfaces required to keep current games working.

## 8. Provider adapters

Design a provider-neutral contract now, but do not claim any provider is active without contract and credentials.

```ts
interface GameProviderAdapter {
  listGames(): Promise<GameCatalogItem[]>;
  createDemoSession(input: DemoSessionInput): Promise<DemoSession>;
  getHealth(): Promise<ProviderHealth>;
}
```

First external adapter candidate remains a provider that supports official demo mode. Provider onboarding is a separate gated slice.

## 9. Release order

1. Document/spec + runtime mode contract.
2. Demo ledger isolation + tests.
3. Auth/profile/demo onboarding.
4. App shell + DEMO status + final-style home/lobby.
5. Demo wallet/promos/loyalty.
6. Taco Slot/Crash demo settlement integration.
7. Support/responsible gaming/admin polish.
8. Asset optimization + PWA hardening.
9. Preview deployment + E2E/mobile/accessibility/performance/security QA.
10. Production deployment in **DEMO mode only** after checks pass.
11. Separate game-lab repository bootstrap and first game migration.

## 10. Definition of Done

- `npm run verify` passes at exact head.
- Demo gameplay never writes to real-money tables.
- Real-money system controls remain fail-closed.
- No production payment provider is invoked from public demo flows.
- DEMO notice is visible on all user-facing gaming/wallet routes.
- Self-exclusion blocks demo gameplay.
- Auth/profile/demo ledger isolation tests pass.
- PWA remains installable and does not cache private endpoints.
- Preview is validated on mobile and desktop with no unresolved P0/P1 runtime errors.
- Vercel preview is READY and linked to the exact commit.
- Documentation/evidence identifies the deployment as DEMO, not licensed real-money operation.
