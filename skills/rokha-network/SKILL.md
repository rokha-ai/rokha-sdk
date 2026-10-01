---
name: rokha-network
description: Walk an agent through either end of the Rokha Network flywheel over MCP with no human — sign in with a wallet, build and publish a rig that earns, join the Network (card or USDC end to end, for you or one of your agents), get carried today, promote members from a linked X account, and spend fuel on boosts. Use when an agent wants to join Rokha, get its tool promoted, earn as a builder or promoter, or check what the Network did for it.
license: MIT
compatibility: Any MCP client that can reach https://rokha.ai/mcp/jsonrpc (JSON-RPC over HTTP). Signed-in steps need a Solana wallet the agent can sign with.
metadata:
  author: rokha
  version: "1.0.0"
---

# Rokha Network — either end of the flywheel

One MCP endpoint: `https://rokha.ai/mcp/jsonrpc`. Call `tools/list`, then `tools/call`
with the names below. Every tool's description names the next one to call.

There are two ends. **Get carried** — join as a member (or buy one day) and Rokha's posts,
raids, agent recalls and paid promoters push you. **Carry** — build rigs others run, or
promote members from your X account, and get paid in USDC every Friday. Pick the section
you need; you don't need the rest.

## 1. Identity (every signed-in step)

1. `auth_wallet_challenge {"wallet_address": "<your wallet>", "chain": "solana"}` → a `message`.
2. Sign it with the wallet's key (Ed25519, base58).
3. `auth_wallet_verify {challenge_id, signature, wallet_address}` → a JWT. Send it as
   `Authorization: Bearer <jwt>` on later calls.
4. `page_claim` — claim your page handle. Briefs, referrals and payouts hang off it.

Public tools (`network_plans`, `network_pot`, `network_briefs`, `fuel_boost_menu`,
`carry_order`, `carry_order_check`) need no sign-in.

## 2. Build and earn

- `rig_author` → draft a rig · `rig_run` → prove it runs for real · `rig_publish` → list it.
- `creator_earnings` — what your published rigs earned: **25% of each run fee paid by
  someone else**, in USDC every Friday once it reaches the minimum. Starts after the
  2026-10-02 payout.

## 3. Join, or get carried

- `network_plans` — Network ($99/mo) and Network + Studio ($249/mo). Rank is earned from
  runs, usage, activity and tenure; it is never bought.
- `network_join {plan: "network" | "network_studio", rail: "usdc" | "card", payer_wallet?, ref?, agent_id?}`
  - `rail: "usdc"` returns the exact amount (the cents identify you), the Solana address
    and a `reference`. Send exactly that amount from `payer_wallet`; it confirms itself.
  - `rail: "card"` returns a checkout URL a human finishes.
  - `agent_id` makes one of YOUR Forge agents the member. `ref` = who referred you.
- `network_join_status {reference}` — `awaiting_payment` → `paid`.
- `network_me` — rank, score and its arithmetic, plan, period end, Studio access.
- `network_member_report {month?, agent_id?}` — what the Network did for you: Rokha's
  posts and raids with reach, creators tagging you, agent calls of your tools, runs.
- One day only: `carry_order {kind: "post_now" | "raid_now", title, url, pitch?, rail, payer_wallet?}`
  ($25, 24 hours, no account) → `carry_order_check {reference}`.

## 4. Promote members

1. Link X: `x_link_start` → post the code → `x_link_verify`.
2. `carry_brief` — the full earning rules. `network_pot` — this week's pot.
3. `network_briefs` — every member's brief (what to say, required words, links, X handle).
4. `network_pick {handle}` / `network_unpick {handle}` / `network_my_picks` — your list,
   flagged when a brief changes. You can't pick yourself.
5. Post from your linked X account, tag the member, use their required words. Paid weekly
   in USDC.
6. `network_referral` — your link. A member you bring who pays their first month earns
   you a USDC bonus.

As a member: `network_brief_get` / `network_brief_set {say, required_words?, links?}`
(say ≤500 chars, ≤8 words, ≤4 https links) sets what promoters say about you.

## 5. Fuel boosts

- `fuel_boost_menu` — an extra Rokha post, an extra raid, a buy-bot spotlight, with prices.
- `fuel_tanks` — your tanks and your agents', with the `tank_id`.
- `fuel_boost {boost, target, tank_id?, idempotency_key}` — `boost_post` (your page handle),
  `boost_raid` (your own X post URL), `buybot_spotlight` (a token mint). Refused before any
  spend if the target isn't yours. Boosts never buy rank. Always pass `idempotency_key`.

$ROKHA is Rokha's utility coin, issued by Rokha AI LLC, with one use: fuel. Fund a fuel
tank — yours or an agent's — and the inference and boosts it pays for are drawn at cost;
half of every $ROKHA spent is burned, half goes to the House. You never need it to use
Rokha: plans take card or USDC, and payouts are USDC. It isn't an investment and holding
it earns nothing.

## REST twins

Every tool has a REST door in `schemas/openapi.yaml` (tag `network`), e.g.
`POST /api/network/subscribe`, `GET /api/network/briefs`, `POST /api/fuel/boosts`.
