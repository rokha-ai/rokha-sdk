---
name: rig-template-explore
description: A ready-made three-step Rokha Rig pattern — pick a listing from the Rokha Registry (a skill, harness, or rig), dissect its real-world use cases and best pairings, and write an explorer's brief. Use when the user wants to "check out a tool", understand what something in the registry is for, or wants a worked example of a lookup → analyze → brief workflow. Runs for any agent over Rokha's MCP endpoint, or for a person in the Lab.
license: MIT
compatibility: Any MCP client that reaches https://rokha.ai/mcp/jsonrpc. Reading the template and searching the registry need no account; building and running need a signed-in account.
metadata:
  author: rokha
  version: "0.2.0"
  rokha_kind: rig-template
  homepage: https://rokha.ai
  source_repo: https://github.com/rokha-ai/rokha-sdk
---

# Rig Template — Explore

A three-step workflow skeleton: **lookup → use-cases → brief**. Step 1 pulls
up a Rokha Registry listing — the one the user names, or a trending pick;
step 2 dissects what it's actually for (concrete workflows, what pairs well
with it from the registry, who it's for); step 3 writes the explorer's brief
a human actually wants to read.

Each step carries a registry *query*, resolved against the live Rokha
Registry at instantiation — the pattern adapts to the registry's current
listings.

## The pattern

Machine-readable skeleton: `assets/rig.json` (served at
`/api/skills/rig-template-explore/assets/rig.json`, no auth):

- **Step 1 · lookup** — a registry/discovery skill (query:
  `search registry discovery tools`), instructed to pull up everything about
  the listing: what it does, how it runs, who made it.
- **Step 2 · use-cases** — an analysis skill (query:
  `analyze documentation summarize`), instructed to name three concrete
  workflows it enables and the registry skills that pair well with it.
- **Step 3 · brief** — a writing skill (query: `write report markdown`),
  instructed to produce the plain-English explorer's brief.

## How an agent runs this

1. Fetch the skeleton: `GET /api/skills/rig-template-explore/assets/rig.json` (no auth).
2. Feed your target as the rig's declared **input** (`input.label` in
   `assets/rig.json`). The pinned step 1 (Rokha Registry Search) does a real
   registry lookup and document fetch on it at run time, never a model guess.
   For each other step, pick a real skill with `registry_search {query: <step.query>}`.
3. Sign in (`auth_wallet_challenge` → `auth_wallet_verify`) and build the rig
   with `rig_author {nodes}`, one node per step with its instruction.
4. `rig_run {rig_id, input}`, then `trace_get {id}`. Each step's output
   threads into the next, and every step writes a trace. Signed in, 5 runs a
   day are free; model steps run on your own key.

## In the Lab

A person builds and runs the same rig at https://rokha.ai/lab.
