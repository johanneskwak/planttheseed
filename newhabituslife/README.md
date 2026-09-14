# 인생 한 바퀴 — 플레이하는 사회

Independent life board game at `/newhabituslife`. Original pages, lg2 tables, and RPG are untouched.

## Play
- Solo: one human and 1–5 AI players. Quick start uses three AI players.
- Shared device: 2–6 teams take turns on the same screen.
- Online: 2–6 teams enter a six-character room code. Host also plays and keeps the tab open as the trusted referee. Same-browser reconnection is available for seven days. Do not enter real student names or family circumstances.
- 8 or 12 rounds; first two rounds are education, third is careers. Later rounds use landing tiles.
- Dice animation, choice cards, consent-based support/business proposals, public fund, policy votes, investment market, personal goals, recap and text export.

## Technical model
`engine.mjs` is a deterministic seeded state machine with turn, phase, budget and consent validation. `app.mjs` renders all modes. Browser-controlled input is escaped. Online participants submit their own actions; host applies the same engine and persists snapshots with optimistic version checks. Room/member bearer tokens are never returned to other members. Direct table access is revoked and RLS enabled. The host is intentionally trusted, not a cheat-resistant competitive authority. Polling is every 1.8 seconds; no websocket/publication change required.

`../supabase/newhabituslife.sql` creates only nlh_* tables and one token-checked RPC. Migration installed on the existing schoolshare project. Do not rerun CREATE TABLE on an installed database; use a follow-up migration. Expired rooms become inaccessible after seven days; this is an access expiry, not automatic data deletion.

Game values are fictional. End-of-game bars compare starting and final assets without causal or intergenerational inference. Game money is not real Korean salary data. In the first two rounds school events are guaranteed regardless of tile, and in round three career is guaranteed; subsequent play follows the landing tile.

## Validation
`node tests/newhabituslife.test.mjs` simulates 150 full games across 2–6 players and 8/12 rounds, and tests affordability, turn ownership, support consent and concurrent policy votes.

No build dependencies. Serve repository root with a static HTTP server. Absolute asset paths stay under `/newhabituslife/` to support both slash and slashless routes.

## v3 additions from the uploaded v2
Preserves advice tokens, information sharing, negotiated loans, simultaneous market guesses, public crises, promises, achievements and projector view. Adds one-use crisis insurance, AI discussion pause, longer AI decision time, reduced-motion and keyboard focus support, and previous-run asset comparison after swapping existing starting backgrounds.

Fixes lender receivables, combined 50-per-turn repayment budget, final debt recovery/write-off, context validation for off-turn actions, duplicate promise rewards, crisis acknowledgement ownership, round-start tax snapshots and seed-independent keyed random draws. Replays retain dice/market/crisis draws even if choices differ. This supports discussion; choices and interactions still differ, so it is not a controlled causal estimate. The policy previously named progressive income tax is now accurately called asset-based differential contribution; it is a simplified game rule.

Existing installs need `supabase/newhabituslife_v3.sql`. It expands permitted actions and snapshot capacity without changing RPG or original game tables. Online state is shared with all authenticated room members; hidden choices and forecasts are a UI mechanic, not a cryptographic secret. Host remains trusted. Loans settle in player/loan order at the end: cash, investments and housing up to net assets excluding bank debt; unrecovered balance becomes lender loss.

Additional checks: `node tests/newhabituslife-v3.test.mjs` verifies loans, insurance, stale actions, promise limits, identical replay draws, tax equality and migration. A DOM integration harness verified full solo play, resume, room start and host controls; live browser visual verification remains blocked by preview authentication.

## Deployment status
This branch is a static preview only. Do not merge its static Vercel configuration over the existing Next.js production project. Requested `planttheseed.vercel.app` and connected `theplanttheseed` project do not currently match. Vercel team access must be restored and the target mapping confirmed before production deployment. Draft PR: https://github.com/johanneskwak/planttheseed/pull/1
