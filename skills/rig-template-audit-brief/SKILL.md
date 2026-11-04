---
name: rig-template-audit-brief
description: "A ready-made three-step Rokha Rig pattern — fetch → analyze → report. It takes ONE registry listing as its input: step 1 looks that listing up and fetches its real document, step 2 inspects the document for security and trust-boundary issues, step 3 writes a plain-language brief ending in an adopt / try-with-care / avoid verdict. Use when the user wants to vet a tool before adopting it, or wants a worked example of a fetch → analyze → report workflow. Runs for any agent over Rokha's MCP endpoint, or for a person in the Lab."
license: MIT
compatibility: Any MCP client that reaches https://rokha.ai/mcp/jsonrpc. Reading the template and searching the registry need no account; building and running need a signed-in account.
metadata:
  author: rokha
  version: "0.2.0"
  rokha_kind: rig-template
  homepage: https://rokha.ai
  source_repo: https://github.com/rokha-ai/rokha-sdk
---

# Rig Template — Audit & Brief

A three-step workflow skeleton: **fetch → analyze → report**. The rig declares
one **input** — the registry listing you want vetted. Step 1 looks that listing
up and fetches its real document; step 2 inspects the document for security
issues — what it accesses, trust boundaries, risky patterns; step 3 writes the
brief a human actually wants to read, ending in a clear trust verdict.

Each step carries a registry *query*, resolved against the live Rokha
Registry at instantiation — the pattern adapts to the registry's current
listings.

## The pattern

Machine-readable skeleton: `assets/rig.json` (served at
`/api/skills/rig-template-audit-brief/assets/rig.json`, no auth):

- **Step 1 · fetch** — PINNED to Rokha Registry Search (`rokha-registry`),
  instructed to look up the listing named as the rig's input and fetch its
  real document (SKILL.md / server page) — the source material for the audit.
  Pinned rather than query-resolved because this step must be a known Rokha
  capability, not a fuzzy match.
- **Step 2 · analyze** — a security skill (registry query:
  `security audit code review`), instructed to inspect what it accesses,
  its trust boundaries, and risky patterns.
- **Step 3 · report** — a writing skill (registry query:
  `write report markdown`), instructed to write the audit brief with a
  clear trust verdict.

## How an agent runs this

1. Fetch the skeleton: `GET /api/skills/rig-template-audit-brief/assets/rig.json` (no auth).
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
