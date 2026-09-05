# ADR-0002 — Separate CHIDO Games Lab Repository

- **Status:** Proposed for owner approval
- **Date:** 2026-08-12
- **Decision owner:** HOCKER
- **Related product:** APP-05 Chido Casino
- **Related repository:** `HockerAGI/chido.casino`

## Context

CHIDO needs a dedicated environment for original-game mathematics, RNG/fairness work, high-volume simulation, rendering/asset pipelines, game QA and future certification evidence. Those activities have a different lifecycle and risk profile from the casino application that owns user identity, product UX, responsible gaming, demo/regulated wallet boundaries, provider adapters and release controls.

The canonical architecture permits a separate repository/service when there is a measurable reason such as regulatory isolation, security, scaling profile, ownership or independent release lifecycle. The game laboratory satisfies several of those criteria.

## Decision

Create a separate repository named:

`HockerAGI/chido-games-lab`

The lab will own reusable game-development packages, original games, simulators, certification artifacts and game visual assets.

Proposed initial structure:

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

`HockerAGI/chido.casino` remains the product/runtime boundary and consumes immutable/versioned game contracts or bundles from the lab.

## Security boundary

The lab MUST NOT contain:

- production payment-provider credentials;
- Supabase service-role or other production admin credentials;
- player PII/KYC data;
- production wallet/ledger state;
- real-money settlement capability;
- unredacted production traces.

Simulation inputs and QA identities must be synthetic.

## Integration contract

The first shared contract should expose versioned game metadata and a server-authoritative result envelope rather than direct database access. A game bundle never mutates player balance itself; `chido.casino` owns account/session and the relevant demo or future regulated settlement adapter.

## Consequences

### Positive

- certification evidence can evolve independently from public casino releases;
- large simulation and asset workloads do not pollute production app CI;
- game engine and renderer can be versioned/reused across CHIDO Originals;
- clearer security boundary around money, users and production secrets;
- easier future provider-style packaging and independent game QA.

### Cost

- one more repository to govern, protect and release;
- package/bundle versioning must be explicit;
- CI must verify compatibility between a game contract version and `chido.casino`.

The separation is justified because these are real lifecycle/isolation differences, not premature microservice decomposition.
