# Chido Casino — Project Documentation

## Overview
Chido Casino (chidocasino.com) — plataforma de entretenimiento de juegos de azar para México. Stack: Next.js 14 (App Router), Supabase, Tailwind CSS, TypeScript. Port 5000.

## Architecture
- **Framework**: Next.js 14 App Router
- **Auth/DB**: Supabase (env vars required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- **Styling**: Tailwind CSS with custom design tokens
- **Runtime**: Node.js on Replit, port 5000

## Key Routes
| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, CTA |
| `/login`, `/signup` | Auth pages |
| `/lobby` | Main game lobby — 12 games, categories, promo |
| `/games/crash` | Chido Crash (live) |
| `/games/taco-slot` | Taco Slot (live) |
| `/games/azteca-wild` | Azteca Wild (coming soon stub) |
| `/games/catrina-bonanza` | Catrina Bonanza (coming soon stub) |
| `/games/lucha-megaways` | Lucha Megaways (coming soon stub) |
| `/games/piñata-fiesta` | Piñata Fiesta stub |
| `/games/turbo-plinko` | Turbo Plinko stub |
| `/games/bonanza-dulce` | Bonanza Dulce stub |
| `/wallet` | Chido Wallet (deposit/withdraw/SPEI) |
| `/vip` | VIP Club — 5 levels, perks, cashback |
| `/promos` | Bonos y promociones |
| `/tournaments` | Torneos |
| `/profile` | Cuenta del usuario |
| `/affiliates` | Programa de afiliados |
| `/support` | Soporte (WhatsApp, FAQ) |
| `/legal` | Términos y privacidad |

## Critical Resilience — No Supabase Crash
All Supabase-dependent code guards against missing env vars:
- `src/lib/supabaseClient.ts` — returns `null` if vars missing
- `src/lib/session.ts` — returns `null` if vars missing (no crash)
- `src/lib/useProfile.ts` — handles null client gracefully
- `src/app/(auth)/login/page.tsx` — shows config banner, doesn't crash
- `src/app/(auth)/signup/page.tsx` — shows config banner, doesn't crash
- `src/middleware.ts` — resilient to missing vars

## Engagement Mechanics
- `src/components/ui/daily-streak-bar.tsx` — Daily 7-day streak bonus widget (lobby)
- Betting from `$0.10 MXN` on Crash and Taco Slot

## Design System
- **Primary accent**: #FF0099 (pink)
- **Secondary accents**: #FF5E00 (orange), #00F0FF (cyan), #32CD32 (green), #FFD700 (gold)
- **Background**: #0a0a0b (near-black)
- **Font style**: font-black for headings, commercial/marketing tone
- **Language**: Mexican slang in UI (¡Que curado!, ¡No hay falla!, ¡A todo dar!, ¡Órale!) — NOT in footer

## Key Files
| File | Purpose |
|------|---------|
| `src/lib/games.ts` | 12-game catalog with RTP/maxWin/volatility metadata |
| `src/lib/playerLevel.ts` | 5 VIP levels (Verde → Jalapeño → Serrano → Habanero → Salsa Pro) |
| `src/app/lobby/page.tsx` | Full lobby: 6 category filters, game grid, hero banner, win feed, Chidowins widget |
| `src/app/wallet/wallet-client.tsx` | Chido Wallet UI (SPEI deposit, CLABE withdrawal, tx history) |
| `src/app/vip/page.tsx` | VIP Club page |
| `src/components/layout/main-layout.tsx` | Navigation (desktop sidebar + mobile bottom nav + drawer) |
| `src/components/layout/footer.tsx` | Footer (no slang per requirements) |
| `src/middleware.ts` | Auth guard (gracefully handles missing Supabase env vars) |
| `public/manifest.json` | PWA manifest with shortcuts |

## Branding Rules
- NEVER use "bóveda" — always "Chido Wallet"
- Mexican slang ONLY in UI content, never in footer
- AGI characters: Chidowins (AI assistant widget), Chido Gerente (VIP optimizer, stub), Curvewind (future)
- Logo variants: `iso-color` (nav/CTA), `iso-bw` (footer), `full` (desktop sidebar)

## Payment Integration
- Current: Manual SPEI via `/api/payments/create-deposit`
- Planned: Conekta, OpenPay, Juno (stubs ready for env vars)
- Required env vars: `PAYMENTS_PROVIDER`, `ASTROPAY_*`, `ADMIN_API_TOKEN`

## VIP System
5 levels via XP accumulation (each bet awards XP automatically):
1. Verde — 0 XP (0% cashback)
2. Jalapeño — 500 XP (2% cashback)
3. Serrano — 1,500 XP (5% cashback)
4. Habanero — 3,000 XP (8% cashback, priority withdrawals)
5. Salsa Pro — 6,000 XP (12% cashback, private games access)

## Required Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
ADMIN_API_TOKEN
TELEGRAM_BOT_TOKEN (optional)
NEXT_PUBLIC_SUPPORT_WHATSAPP
NEXT_PUBLIC_SUPPORT_EMAIL
```

## PWA
- manifest.json configured with shortcuts (Crash, Wallet)
- theme_color: #FF0099
- start_url: /lobby
