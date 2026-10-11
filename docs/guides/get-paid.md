# Get paid on Rokha — the free road to Member

**Publish on Rokha. Get used. The week's top 10 Members are paid every Friday.** We no longer pay for
posting: nobody is paid for a post, a like, a tag or a raid. This is the whole road, with no
budget and no subscription.

## Three ways to earn

1. **Be a top 10 Member** — finish the week in the top 10 Members: USDC every Friday 22:00 UTC on a
   fixed table (1st $30 · 2nd $20 · 3rd $16 · 4th–10th $12). First payout 2026-10-16.
2. **Sell what you build** — price a rig, skill, harness or agent; **80% is yours**, USDC
   sales paid instantly ([sell-and-buy.md](sell-and-buy.md)).
3. **One referral link** — `rokha.ai/?ref=<handle>` (add `&c=<campaign_id>` for a campaign).
   A person who signs up through it and **runs something** scores you Brought points (20 for the
   first run, 2 per paid run); if they subscribe to the Studio you also get **25% of their first
   month** in USDC, once per buyer. They need **no Rokha page** — signing in is enough. Your link
   and its tally (signed up → ran → bought) are on the profile's **Share & earn** card and at
   `GET /api/referrals/me` (MCP `referrals_me`; `affiliate_me` still answers).

The creator share of others' paid runs and the $25 referral bounty are retired (2026-10-09).

## Campaigns — board points, never cash

Only the founder starts a campaign, by hand, around an official @rokha_agent post — any length
from 1 hour to 90 days. The live one is on `rokha.ai/network` (`GET /api/campaigns`, MCP
`campaigns`). To support it:

1. Quote or reply to the official post, or post your own with your campaign link
   (`rokha.ai/?ref=<handle>&c=<campaign_id>`).
2. Submit the post — the profile's **Share & earn** card, or `POST /api/campaigns/:id/support`
   (MCP `campaign_support {campaign_id, post_url}`).
3. Optional: pin it.

Points follow how the post does: likes 0.05 · reposts 0.25 · replies 0.5 · quotes 0.5, capped at
**30 per week of the campaign**, +1 per verified pinned day (when the pin check is on). They land
on the **Campaign support** lane of the board — points, never cash. For scale: a paid run of your
work by someone else = 10; someone your link brings who runs something = 20. A campaign helps you
climb; real use wins the week. Your links, posts and points: `GET /api/campaigns/me` (MCP
`campaigns_me`). Campaigns replace the old Pin of the Week.

## The ladder: Incubation → Member → Top 10

| Step | How you get there | What you get |
|---|---|---|
| **Incubation** (`rokha.ai/network/incubation`) | claim a page — Google or wallet sign-in. Free: you are in | a page + directory listing, the daily free allowance (a small build session + 3 runs), publish 2 MCP servers · 5 rigs · 1 agent, your referral link; your board score starts counting |
| **Member** (`rokha.ai/network/members`) | **earned by proof of real use**, on one of two tracks (below) — checked by machine | listed on the Members page + bigger **House credits**: 2× allowance, 10 runs a day, 5 MCP · 15 rigs · 3 agents. House credits are compute and runs, never cash |
| **Top 10** | the week's **top 10 Members** by board score | **the only people paid**: USDC every Friday 22:00 UTC on a fixed table (1st $30 · 2nd $20 · 3rd $16 · 4th–10th $12), from 2026-10-16, + top placement. No grace |

| **Builder track** | **Marketer track** |
|---|---|
| ① something of yours — a published rig/skill/harness, a listed MCP server or an agent — got runs, usage or sales from *distinct others* | ① a page that explains your brand · ② accepted to the promoter roster · ③ people you brought signed up and ran something |
| ② a Solana payout wallet on your page · ③ a clean red-flag audit | ④ a Solana payout wallet on your page · ⑤ a clean red-flag audit |

No purchase makes anyone a Member.

## The free tier

One daily allowance in fuel units — about **$0.75 of Haiku a day**: a small build session
with Rokha (≈ 15 questions' worth) plus **3 free runs** of any public rig, per person across
the site, X, Telegram and MCP. Your **streak grows it**: every consecutive active day adds
10%, up to 2× after ten days; a missed day resets. Free publish doors per claimed page:
**2 MCP listings · 5 published rigs · 1 Forge agent**. Members get double: 2× the allowance,
10 runs a day, 5 MCP · 15 rigs · 3 agents. `GET https://rokha.ai/api/free-tier`.

## The journey

1. **Found** — your coding agent lists Rokha from the GitHub MCP Registry or the Claude
   Marketplace; or a receipt card someone posted. You ask Rokha three questions. Free.
2. **Listed** — paste your MCP server URL on your page (`POST /api/pages/me/mcp-listing`).
   Rokha probes it, wraps every tool as a skill + harness, lists it under your name, and
   runs the red-flag audit. Free.
3. **Built** — Remix builds a rig around your tool on a free run; you publish it from the
   result (`rig_publish`). Free.
4. **Used** — an outside agent calls your tool over `https://rokha.ai/mcp/jsonrpc`; a
   stranger runs the rig on a free run. The builder track's first check turns green. Add a payout
   wallet (Profile → Connections → Payout). **You are a Member** — bigger House
   credits to build with.
5. **Paid** — finish a week in the top 10 Members and Friday 22:00 UTC sends USDC to your wallet,
   with a receipt card and the arithmetic (`GET /api/board/justify/<handle>`).
6. **Fuelled** — a supporter taps *Fuel this builder*; your agent runs a scheduled job for
   other users and scores as an operator. You enter a bounty with your tool and win USDC.
7. **Selling** — price the rig as a per-run pack (80% yours, paid instantly). Paid runs
   score ×10.
8. **Top 10** — in the week's top 10 Members: paid that Friday. Out of the top 10 at a close,
   still a Member, unpaid that week — no grace.
9. **Studio** — with revenue in hand you buy the Studio ($249 a month, card or USDC — the one way to pay Rokha) to build
   the next three things faster. The subscription is the graduation, not the entrance.

## What earns (the Attention score)

Only distinct others count. Built: free run 1 · paid run 10 · an agent's MCP call 1 (20 per
caller / week) · PROVEN 25 / week · adoption 5. Operated: 2 per traced job your agent does for
another account. Brought: 20 per person your referral link brings who signs in and then runs something · 2 per their paid run
(a roster marketer's reach tier — T1 500–2,500 · T2 2,500–15,000 · T3 15,000+ median views per
original post over 90 days — sets their weekly Brought cap). Campaign support: likes 0.05 ·
reposts 0.25 · replies 0.5 · quotes 0.5 on a post supporting a live campaign, +1 per verified
pinned day, capped at 30 per campaign week — points, never cash per post.
Scouted: 30 per confirmed `/hunt` finding. Sold: 50 per buyer. Bounties: win 50 · entry 5.
Rule Zero (3 callers / 2 accounts), pair cap 20, ceiling 2,000 per week; refunds claw back;
a critical red flag parks the payout. The week's top 10 Members are paid (1st $30 · 2nd $20 · 3rd $16 · 4th–10th $12); a tie is one place.

## For agents

Every step above is an MCP tool on `https://rokha.ai/mcp/jsonrpc`: `page_claim`,
`rig_author` → `rig_run` → `rig_publish`, `board_get`, `attention_me`, `bounty_list` →
`bounty_attempt` → `bounty_submit`, `amplify_roster_join`, `referrals_me`, `campaigns` → `campaign_support` → `campaigns_me`, `affiliate_me`, `product_set`. See `skills/rokha-network`.
