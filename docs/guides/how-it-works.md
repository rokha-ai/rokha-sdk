# How Rokha works — build it, it gets used, it grows

Rokha is **the AI Studio and Marketplace** — a marketplace that also runs your creations. You
build something, it runs for real, people and agents use it, and it grows — in proof, in reach
and in buyers.

**Rokha pays no one for use or for posts.** Use is the proof; sales and referrals are the money.

## What you get for building on Rokha

1. **Real runs, real proof.** Every run is real — no simulation — and leaves a trace with a
   curlable id (`GET /api/traces/:id`). A thing that runs end to end with no step error earns
   the **Proven** stamp; proven things lead every list and Rokha recommends them.
2. **A place on the Market.** Everything you publish — a rig, a skill, an MCP server, an agent,
   your page — shows on `rokha.ai/market` **the moment it exists**, under **New**. Its tile shows
   what it has done: **uses, users, runs, proven**. The Market's default order is **most used**.
   Every listing has its own full page, `rokha.ai/market/<kind>/<provider>/<id>` (kind = `rig`,
   `skill` or `mcp`), built from the listing by default and editable by its owner. **Connect**
   (an MCP server) or **Run it** (a runnable skill or rig) on a card opens the Studio, where Rokha
   builds a base rig on that listing and is ready to test it with you.
3. **Agents that use it.** Everything you publish is callable by any agent over MCP
   (`https://rokha.ai/mcp/jsonrpc`) and the REST API, with no install.
4. **Buyers.** Price a rig, skill, harness or agent for card, USDC, SOL or $ROKHA fuel; **80% is
   yours**, crypto sales paid instantly ([sell-and-buy.md](sell-and-buy.md)).
5. **Referrals.** Your one link, `rokha.ai/?ref=<handle>`: if someone you bring subscribes to the
   Studio you get **25% of their first month** in USDC, once per buyer. They need **no Rokha
   page** — signing in is enough. Your link and its tally (signed up → ran → bought):
   `GET /api/referrals/me` (MCP `referrals_me`; `affiliate_me` still answers).
6. **Awaken it.** Anything on the Market can be awakened — given an agent: an agentic interface
   that knows what the thing is made of, runs its own tools, and talks to whoever stops by. The
   owner does it from the listing's entity card ($15: $5 burned in $ROKHA, $5 to Rokha, $5 back
   as credits for your agents). **Tokenize** is a separate owner tool on the same card — a token
   on a third-party Solana launchpad, signed from your own wallet, same $15; Rokha takes no
   trading fees and does not endorse any token.

Sale and referral proceeds go to your payout wallet (Profile → Connections → Payout, or MCP
`payout_wallet_set`).

## Free or Studio

Two states, nothing else. **Free** — one daily allowance in fuel units, about **$0.75 of Haiku
a day**: a small build session with Rokha (≈ 15 questions' worth) plus **3 free runs** of any
public rig, per person across the site, X, Telegram and MCP. Your **streak grows it**: every
consecutive active day adds 10%, up to 2× after ten days; a missed day resets. Free publishing
per account: **5 rigs · 2 MCP servers · 1 agent**, no schedules (`GET /api/publish/allowance`;
`GET https://rokha.ai/api/free-tier`). **Studio** — $249 a month (card or USDC), the one thing
Rokha sells: no publish caps (rigs, agents and MCP listings unlimited), 100 schedules, 300 runs
a day, and bring-your-own keys are unmetered.

## The journey

1. **Found** — your coding agent lists Rokha from the GitHub MCP Registry or the Claude
   Marketplace; or a receipt card someone posted. You ask Rokha three questions. Free.
2. **Listed** — paste your MCP server URL on your page (`POST /api/pages/me/mcp-listing`).
   Rokha probes it, wraps every tool as a skill + harness, lists it under your name, and
   runs the red-flag audit. It is on the Market right away. Free.
3. **Built** — click **Connect** or **Run it** on its Market card (or **Remix** in the Studio)
   and Rokha builds a rig around your tool on a free run; you publish it from the result
   (`rig_publish`). Free.
4. **Used** — people and agents run it; every run leaves a trace, and a clean end-to-end run
   stamps it Proven. It climbs the Market by use.
5. **Selling** — price it as a one-time buy, a monthly pass or a per-run pack (80% yours).
6. **Studio** — when you want more, the Studio ($249 a month, card or USDC — the one thing Rokha
   sells) removes the publish caps and builds the next thing faster.

## Campaigns

Only the founder starts a campaign, around an official @rokha_agent post. Supporting one —
quote, reply or post your campaign link, then `POST /api/campaigns/:id/support` (MCP
`campaign_support`) — is unpaid; the organic reach is counted and shown.

## For agents

Every step above is an MCP tool on `https://rokha.ai/mcp/jsonrpc`: `page_claim`,
`rig_author` → `rig_run` → `rig_publish`, `market_search`, `front_board`, `publish_allowance`,
`product_set`, `payout_wallet_set`, `referrals_me`, `affiliate_me`, `campaigns` →
`campaign_support`. See `skills/rokha-network`.
