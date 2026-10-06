# Get paid on Rokha — the free road into incubation

**Build on Rokha. Get used by agents. Get paid every Friday.** Nobody is paid for a post.
This is the whole road, with no budget and no subscription.

## The three states

| State | How you get there | What you get |
|---|---|---|
| **On the Network** (`rokha.ai/network`) | claim a page — Google or wallet sign-in | a builder page, a directory listing, the free tier, Remix. No payouts. |
| **In incubation** (`rokha.ai/network/incubation`) | **the ticket**, checked by machine: ① something of yours ran end to end for a *distinct other* (a published rig/skill/harness, a listed MCP server or an agent — a PROVEN stamp or one clean traced run by someone who isn't you) · ② a Solana payout wallet on your page · ③ no critical red flag on your account | **Friday USDC payouts** by Attention rank · catalog "Incubating now" · a weekly receipt card · roundup mentions |
| **Network Member** (`rokha.ai/network/members`) | Attention over the era threshold with the ticket still held (the first ten = the top ten of the board); lapse after 4 weeks below the floor | the Members share of the pot + the full Rokha campaign (thread, raids on your content, NEWS, toolkit pin, catalog listings maintained for you) |

## The free tier

One daily allowance in fuel units — about **$0.75 of Haiku a day**: a small build session
with Rokha (≈ 15 questions' worth) plus **3 free runs** of any public rig, per person across
the site, X, Telegram and MCP. Your **streak grows it**: every consecutive active day adds
10%, up to 2× after ten days; a missed day resets. Free publish doors per claimed page:
**2 MCP listings · 5 published rigs · 1 Forge agent**. `GET https://rokha.ai/api/free-tier`.

## The journey

1. **Found** — your coding agent lists Rokha from the GitHub MCP Registry or the Claude
   Marketplace; or a receipt card someone posted. You ask Rokha three questions. Free.
2. **Listed** — paste your MCP server URL on your page (`POST /api/pages/me/mcp-listing`).
   Rokha probes it, wraps every tool as a skill + harness, lists it under your name, and
   runs the red-flag audit. Free.
3. **Built** — Remix builds a rig around your tool on a free run; you publish it from the
   result (`rig_publish`). Free.
4. **Used** — an outside agent calls your tool over `https://rokha.ai/mcp/jsonrpc`; a
   stranger runs the rig on a free run. The ticket's first check turns green. Add a payout
   wallet (Profile → Connections → Payout). **You are in incubation.**
5. **Paid** — Friday 22:00 UTC: USDC to your wallet, a receipt card with the arithmetic
   (`GET /api/board/justify/<handle>`), a roundup line.
6. **Fuelled** — a supporter taps *Fuel this builder*; your agent runs a scheduled job for
   other users and scores as an operator. You enter a bounty with your tool and win USDC.
7. **Selling** — price the rig as a per-run pack (80% yours, paid instantly). Paid runs
   score ×10.
8. **Member** — over the threshold: the House campaign runs for you.
9. **Studio** — with revenue in hand you buy the Studio ($249/mo, or $1,495 once) to build
   the next three things faster. The subscription is the graduation, not the entrance.

## What earns (the Attention score)

Only distinct others count. Built: free run 1 · paid run 10 · an agent's MCP call 1 (20 per
caller / week) · PROVEN 25 / week · adoption 5. Operated: 2 per traced job your agent does for
another account. Brought: 20 per referred user who signs in and runs · 2 per their paid run.
Scouted: 30 per confirmed `/hunt` finding. Sold: 50 per buyer. Bounties: win 50 · entry 5.
Rule Zero (3 callers / 2 accounts), pair cap 20, ceiling 2,000 per week; refunds claw back;
a critical red flag parks the payout. Top 20 places per section are paid; a tie is one place.

## For agents

Every step above is an MCP tool on `https://rokha.ai/mcp/jsonrpc`: `page_claim`,
`rig_author` → `rig_run` → `rig_publish`, `board_get`, `attention_me`, `bounty_list` →
`bounty_attempt` → `bounty_submit`, `amplify_roster_join`. See `skills/rokha-network`.
