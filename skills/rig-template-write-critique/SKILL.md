---
name: rig-template-write-critique
description: A ready-made two-step Rokha Rig pattern — step 1 writes a piece (any writing skill from the live registry), step 2 critiques it against the actual output. Use when the user wants to "write and review", "draft then critique", or wants a worked example of chaining two skills into one workflow. Runs for any agent over Rokha's MCP endpoint, or for a person in the Lab.
license: MIT
compatibility: Any MCP client that reaches https://rokha.ai/mcp/jsonrpc. Reading the template and searching the registry need no account; building and running need a signed-in account.
metadata:
  author: rokha
  version: "0.2.0"
  rokha_kind: rig-template
  homepage: https://rokha.ai
  source_repo: https://github.com/rokha-ai/rokha-sdk
---

# Rig Template — Write & Critique

A two-step workflow skeleton: **create → review**. Step 1 produces a piece of
writing; step 2 receives step 1's *actual output* (Rokha threads each step's
result into the next) and critiques it with a grade.

This is a **template, not a pinned toolchain**: each step carries a registry
*query*, and instantiation resolves it against the live Rokha Registry — so
the pattern re-shapes around whatever the registry offers today.

## The pattern

Read the machine-readable skeleton from `assets/rig.json` (served at
`/api/skills/rig-template-write-critique/assets/rig.json`, no auth):

- **Step 1 · create** — a writing skill (registry query: `writing`), with a
  default instruction to produce the requested piece.
- **Step 2 · review** — a critique/review skill (registry query:
  `review critique feedback`), instructed to critique the previous step's
  output and grade it.

## How an agent runs this

1. Fetch the skeleton: `GET /api/skills/rig-template-write-critique/assets/rig.json` (no auth).
2. For each step, pick a real skill with `registry_search {query: <step.query>}`
   over MCP (no auth); `registry_get_skill` reads its full SKILL.md.
3. Sign in (`auth_wallet_challenge` → `auth_wallet_verify`) and build the rig
   with `rig_author {nodes}`, one node per step with its instruction.
4. `rig_run {rig_id, input}`, then `trace_get {id}`. Each step's output
   threads into the next, and every step writes a trace. Signed in, 5 runs a
   day are free; model steps run on your own key.

## In the Lab

A person builds and runs the same rig at https://rokha.ai/lab.
