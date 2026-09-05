# CHIDO Launch Preview + Game Lab — Design

Date: 2026-08-12
Status: DESIGN FOR OWNER REVIEW
Repository: HockerAGI/chido.casino

## 1. Outcome

Convert CHIDO into a launch-quality casino experience where every non-monetary capability is genuinely functional and persistent, while all real-money movement, redeemable value, regulated wagering, and production payment execution remain impossible.

Public state must be explicit but discreet: `DEMO · SIN DINERO REAL · +18`.

This is not a static mockup. Authentication, profile, demo ledger, gameplay, histories, promotions, loyalty, responsible-gaming controls, support, admin/operations, observability, PWA behavior, catalog, provider adapters, and Hocker One monitoring are expected to execute against real application/data paths where safe.

## 2. Non-negotiable gates

- Real deposits: disabled.
- Real withdrawals: disabled.
- Redeemable balances or prizes: disabled.
- Production PSP charge/capture/refund: disabled.
- Real-money betting: disabled.
- External game provider real-money launch: disabled.
- SEO indexing remains disabled while public mode is DEMO.
- No claim of license, certification, operator authorization, certified RTP/RNG, or real-money availability.
- Current credentials are not rotated in this program by explicit Owner decision. Secret values must not be copied into source, docs, logs, traces, PR bodies, client bundles, or test fixtures. This remains a documented security exception, not a resolved control.

## 3. Runtime modes

### DEMO_PUBLIC

Real:
- account creation/sign-in/session recovery;
- age acknowledgement and jurisdiction notice;
- profile/avatar/preferences;
- demo-wallet ledger and balance;
- CHIDO Originals using non-redeemable credits;
- game history/replay metadata;
- bonuses, missions, streaks, loyalty/VIP progression using demo value;
- promo eligibility and claim state;
- responsible-gaming limits, cooldown and self-exclusion;
- customer support intake and ticket state;
- notifications/in-app inbox where implemented;
- favorites/recently-played/search/categories;
- PWA install/update/offline shell;
- analytics, logs, error monitoring and audit trails;
- provider DEMO games only when a provider contract/API explicitly supports demo mode;
- Hocker One monitoring and safe administrative actions.

Simulation/sandbox only:
- deposit UX;
- withdrawal UX;
- KYC document-verification provider step;
- payment-provider step;
- real-money settlement/reconciliation.

### INTERNAL_QA

Adds:
- synthetic KYC fixtures;
- PSP sandbox/test credentials;
- provider sandbox environments;
- administrative approval flows;
- test-only failure injection;
- seedable demo balances and fixtures.

### LICENSED_REAL — future locked mode

Not implemented as active behavior in this program. It may exist only as a gated configuration contract. Activation requires documented legal/operator/provider/KYC/AML/payment/certification gates and Owner approval.

## 4. Experience design

Direction: Premium Dark + Mexican Neon.

Rules:
- CHIDO logo and icon remain canonical brand anchors.
- Existing large visual assets are not mandatory. Reuse only if quality/performance justify it.
- Rebuild banners, thumbnails, backgrounds, game art and motion assets when that gives better quality or smaller payloads.
- Reduce technical/compliance copy in the player journey.
- Keep one persistent compact DEMO indicator and contextual legal notices where required.
- Mobile-first lobby with bottom navigation, search, horizontal collections and fast return to play.
- Desktop uses wider rails/grids without becoming a back-office dashboard.

Primary surfaces:
1. Home/entry.
2. Auth/onboarding.
3. Lobby.
4. Game detail/launch shell.
5. Wallet DEMO.
6. Promos/rewards.
7. VIP/loyalty.
8. Profile/security.
9. Responsible gaming.
10. Support.
11. Legal/DEMO disclosure.
12. Admin/ops integration with Hocker One.

## 5. Data and ledger model

The demo wallet is persistent but has zero monetary value.

Required invariants:
- currency/value type is explicitly DEMO or non-redeemable;
- no demo transaction can be promoted into a real PSP operation;
- all game debits/credits are idempotent and auditable;
- balance changes happen server-side;
- public clients cannot insert or mutate ledger rows directly;
- self-exclusion/limits are checked server-side before every play path;
- histories exposed to users never leak raw seed/private verification material.

A dedicated demo-value discriminator is preferred over overloading future cash balances. If existing balance tables are retained, every write path must prove that demo and real-value domains cannot be confused.

## 6. KYC in DEMO

The UI and state machine should be launch-quality, but public DEMO must not solicit actual identity documents merely to demonstrate the flow.

Public behavior:
- show identity-verification flow and requirements;
- allow readiness/status screens;
- clearly state that real verification is not being completed in DEMO;
- never label a user legally/KYC verified based on the demo flow.

Internal QA may use synthetic documents and provider sandbox later.

## 7. Payments in DEMO

Payment UX can be complete, but production money routes remain fail-closed.

Public:
- deposit/withdraw screens show DEMO behavior;
- actions may create demo intents/events only;
- no redirect or server call can use production PSP execution.

Internal QA:
- Mercado Pago/Stripe sandbox may be exercised if needed for integration testing.

Production PSP credentials remain server-only and inactive for real-money execution.

## 8. CHIDO Originals architecture

### Decision: separate repository `HockerAGI/chido.games`

CHIDO Game Lab and all first-party game engineering live in a separate monorepo named `HockerAGI/chido.games`.

Reasoning:
- game-engine/math releases have a different lifecycle from the casino web app;
- certification evidence must be reproducible and versioned independently;
- renderer/audio/art tooling should not inflate the casino application bundle;
- RNG/math simulation and test harnesses should remain isolated from public UI code;
- each game should be buildable/testable without deploying the whole casino;
- future provider/RGS or laboratory handoff becomes materially easier;
- source ownership, checksums and release artifacts become clearer.

`chido.casino` remains the operator/player application. `chido.games` owns the CHIDO Original game clients, game-specific services, simulation/evidence tooling and the internal Game Lab.

Do not create one repository per game initially. `chido.games` is a monorepo with bounded packages.

Proposed shape:

```text
chido.games/
  apps/
    lab/                 # internal visual/test harness
    game-host/           # independently deployable CHIDO Originals host
  packages/
    game-sdk/            # host contract, events and signed session types
    renderer/            # Pixi/WebGL rendering primitives
    audio/               # audio engine/adapters
    math-core/           # deterministic math utilities
    rng-contracts/       # RNG interfaces/test vectors, never runtime secrets
    certification/       # manifests, checksum tools, evidence generation
    games/
      taco-slot/
      chido-crash/
  simulations/
  fixtures/
  docs/
  tests/
```

### Integration boundary

Games are launched by `chido.casino` through a versioned signed game-session contract. The game host does not receive direct database/service-role access to CHIDO wallet tables.

```text
chido.casino
  -> creates short-lived signed DEMO game session
  -> launches versioned CHIDO Original
  -> game requests round through narrow Game Host API
  -> server validates session + responsible-gaming gates + DEMO value
  -> immutable round result is committed
  -> demo ledger is committed idempotently
  -> signed/audited result envelope returns to renderer
  -> renderer animates the already-decided result
```

The browser renderer never decides payout/win state. A game release can be independently deployed/rolled back without changing the casino application, while the casino retains control of player identity, eligibility, limits and ledger authority.

## 9. Provider architecture

Use a neutral `GameProviderAdapter` contract in CHIDO.

Initial implementations:
- `ChidoOriginalsAdapter`;
- `DemoProviderAdapter` for contracted external provider demo mode;
- future licensed adapters.

The lobby catalog must not couple directly to one aggregator's payload.

Normalize at minimum:
- provider_game_id;
- slug/title/category;
- artwork;
- device support;
- demo_supported;
- real_supported;
- jurisdiction availability;
- launch method;
- tags/features;
- status/version.

## 10. Hocker One control plane

Hocker One should become the operational control plane for CHIDO DEMO, not merely read-only status.

Safe real capabilities to add first:
- health/status;
- deployment/release visibility;
- catalog visibility;
- active promotions visibility;
- demo player/support metrics;
- demo game health/error rate;
- responsible-gaming intervention visibility;
- provider integration readiness;
- feature-flag/readiness state;
- incident mode;
- reversible content/catalog/promo administration only through approved contracts.

Still blocked:
- real deposit confirmation;
- withdrawal payout;
- real balance adjustment;
- real bet execution;
- any action that would imply licensed operation.

## 11. Asset strategy

Keep and optimize:
- CHIDO logo;
- CHIDO app icon/isotype.

Replace or regenerate when beneficial:
- hero backgrounds;
- Open Graph art;
- lobby thumbnails;
- game banners;
- badges;
- decorative textures;
- game symbols/characters/backgrounds.

Asset budgets are enforced by CI/QA. Game assets use per-game bundles and lazy loading; lobby must not preload full game art/audio.

## 12. Performance targets

Player surfaces:
- Core Web Vitals in good range on representative mobile hardware;
- no multi-megabyte lobby image required for first meaningful paint;
- route-level code splitting;
- game bundles loaded only on launch;
- image dimensions fixed to avoid layout shift;
- service worker must never cache private financial/KYC API responses.

## 13. SEO behavior

DEMO_PUBLIC:
- noindex/nofollow/noarchive;
- canonical still valid internally;
- metadata says DEMO, no real-money claims.

LICENSED_REAL future gate:
- indexing, sitemap, schema, game/category pages and final legal/operator metadata become activatable only by approved release configuration.

## 14. Security and privacy

Current Supabase security advisors are not treated as automatically resolved merely because RLS is enabled. The implementation must preserve intentional deny-all/service-only objects and regression-lock approved SECURITY DEFINER exceptions.

Before any new public read/write path:
- prove actor/tenant/user scope;
- use explicit server validation;
- use RLS/grants tests;
- minimize GraphQL/PostgREST discoverability;
- keep service credentials backend-only;
- do not log secret values or KYC documents.

Credential rotation is explicitly deferred by Owner; this does not change the classification of existing credential exposure as an unresolved risk.

## 15. Rollout order

### Slice 0 — baseline lock
- exact-head inventory;
- branch/preview only;
- confirm money/real-bet gates remain fail-closed;
- add explicit runtime mode contract and regression tests.

### Slice 1 — Launch Preview shell
- final home;
- navigation;
- lobby system;
- responsive/mobile polish;
- DEMO disclosure component;
- asset optimization pipeline.

### Slice 2 — Real non-money player lifecycle
- auth/onboarding;
- profile;
- demo wallet/ledger;
- rewards/VIP;
- promo flow;
- histories;
- responsible gaming;
- support.

### Slice 3 — Operations
- Hocker One safe administration and monitoring;
- audit/events;
- incident/readiness views.

### Slice 4 — Game Lab bootstrap
- create `HockerAGI/chido.games`;
- SDK/contracts;
- game-host boundary;
- renderer/audio foundation;
- simulator/certification harness.

### Slice 5 — Taco Slot 2.0
- rebuild as first flagship CHIDO Original;
- art/audio/animation/math simulation;
- demo integration;
- replay/evidence.

### Slice 6 — Chido Crash 2.0
- premium renderer;
- fairness verification UX;
- demo integration;
- replay/history.

### Slice 7 — External provider DEMO
- provider contract/onboarding;
- normalized catalog;
- demo launch;
- provider health/errors;
- no real-money mode.

### Slice 8 — PWA/QA/performance hardening
- install/update/offline behavior;
- device matrix;
- accessibility;
- E2E;
- visual regression;
- performance budgets;
- security diff scan;
- rollback verification.

## 16. Error handling

- Any ambiguity about money mode fails closed.
- If demo ledger write fails, the round must not be presented as committed.
- If provider demo launch fails, show provider/game unavailable, never silently switch to real mode.
- If responsible-gaming status cannot be verified, block play until status is known.
- If user identity/session is uncertain, do not mutate profile/ledger/reward state.
- Feature flags have safe defaults and explicit environment validation.

## 17. Testing

Mandatory layers:
- unit tests for domain rules;
- contract tests for wallet/game/provider adapters;
- DB privilege/RLS tests;
- E2E for auth -> demo wallet -> game -> history -> responsible controls;
- E2E negative tests proving all money paths fail closed;
- visual regression for mobile/desktop;
- asset/performance budget tests;
- game math simulations in Game Lab;
- security diff scan before merge;
- Vercel preview validation before production promotion.

## 18. Tooling to use

Connected tools and skills selected for this program:
- GitHub connector: branches, source inspection, PRs, CI evidence.
- Supabase connector: schema inspection, migrations, RLS/grants/advisors.
- Vercel connector: previews, deployments, runtime errors/logs, production verification.
- Superpowers workflow: brainstorming -> written plan -> TDD -> verification before completion.
- Build Web Apps skills: frontend app builder, React best practices, frontend testing/debugging.
- Supabase/Postgres best-practices skill for migrations and query/security design.
- Codex Security diff-scan skill for security-sensitive PR review.
- Image generation/creative tooling only for original CHIDO-owned assets when implementation reaches the asset/game-art slices.

## 19. Definition of Done for Launch Preview

Launch Preview is complete only when:
- the application visually reads as launch-ready, not a technical laboratory;
- the DEMO label is always discoverable;
- all supported non-money player flows work end-to-end and persist correctly;
- demo credits cannot be redeemed or confused with cash;
- every production money and real-bet path is proven fail-closed by automated tests;
- Hocker One can observe and safely administer the allowed DEMO domain;
- PWA/mobile/desktop behavior passes the device matrix;
- critical runtime errors are zero in the validation window;
- performance/security checks are green;
- the release has rollback evidence;
- no marketing/legal surface claims licensed, certified or real-money operation.
