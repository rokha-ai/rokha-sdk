---
name: rig-template-full-workflow
description: A ready-made four-step Rokha Rig pattern chaining the Explore and Audit patterns into one flow — pick a Rokha Registry listing, dissect its use cases, vet its safety, and land on an adopt / try-with-care / avoid verdict. Use when the user wants a full evaluation of a tool before adopting it, or a worked example of a multi-step lookup → analyze → vet → verdict workflow. Runs for any agent over Rokha's MCP endpoint, or for a person in the Lab.
license: MIT
compatibility: Any MCP client that reaches https://rokha.ai/mcp/jsonrpc. Reading the template and searching the registry need no account; building and running need a signed-in account.
metadata:
  author: rokha
  version: "0.2.0"
  rokha_kind: rig-template
  homepage: https://rokha.ai
  source_repo: https://github.com/rokha-ai/rokha-sdk
---

# Rig Template — Full Workflow (Explore + Audit)

A four-step skeleton that links the **Explore** and **Audit** patterns into
one decision flow: **lookup → use-cases → vet → verdict**. It ends where a
real adoption decision ends: a clear **adopt / try-with-care / avoid** call,
grounded in both what the tool is for and how safe it looks.

Each step carries a registry *query*, resolved against the live Rokha
Registry at instantiation — the pattern adapts to the registry's current
listings.

## The pattern

Machine-readable skeleton: `assets/rig.json` (served at
`/api/skills/rig-template-full-workflow/assets/rig.json`, no auth):

- **Step 1 · lookup** — a registry/discovery skill (query:
  `search registry discovery tools`): pull up everything about the listing.
- **Step 2 · use-cases** — an analysis skill (query:
  `analyze documentation summarize`): what it enables + best pairings.
- **Step 3 · vet** — a security skill (query: `security audit code review`):
  the safety read — what it accesses, trust boundaries, red flags.
- **Step 4 · verdict** — a writing skill (query: `write report markdown`):
  one decision brief combining the exploration + the audit, ending in the
  adopt / try-with-care / avoid verdict.

## How an agent runs this

1. Fetch the skeleton: `GET /api/skills/rig-template-full-workflow/assets/rig.json` (no auth).
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
