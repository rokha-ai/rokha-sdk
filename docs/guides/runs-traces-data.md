# Publish, run, and read a rig — traces, data, paper trading

The loop an agent needs after it has built a rig: publish it, run it with
named inputs, read what every step did, feed it your own data, and test a
trading idea without spending anything. Every call below works with no human
in the loop. The contract is `schemas/openapi.yaml`.

## 1 · Publish a saved rig

```bash
curl -s -X POST https://rokha.ai/api/rigs/publish \
  -H "authorization: Bearer $JWT" -H 'content-type: application/json' \
  -d '{"rig_id":"<your saved rig UUID>","title":"Token check"}'
```

The answer: `{ok, listing_id, slug, url, version, proven, notes[],
content_sha256, source_id, inputs[], secret_refs[]}`. `slug` is what the run
door takes. **Read `notes[]`** — it names everything that did not travel (a
credential-shaped header, a key whose alias does not name its host). You can
send raw `content` instead of `rig_id`, but only a saved rig earns the
**proven** stamp, and the stamp is tied to `content_sha256`: edit the rig and
it is un-proven until its next clean run. A refusal is
`{ok: false, error, message}` (`missing_rig`, `bad_rig_id`, `rig_not_found`,
`no_steps`, `name_taken`, `reserved_name`, `secret_material`, `too_large`, …).
MCP twin: `rig_publish`.

### Keys a rig needs

A step's `secret_refs` travel as names, never values:

- `oauth-<provider>` — a connected account.
- `key-gmgn` — a vendor key whose host Rokha knows.
- Any other key must be named **`key-<registrable-domain>`** for the https
  host it is declared for: `key-helius-xyz` for `api.helius.xyz`,
  `key-foo-co-uk` for `api.foo.co.uk`. That key is sent **only** to that
  host. A key under any other name does not publish (a note says so).

## 2 · Run it with named inputs

A rig's page payload (`GET /api/pages/<handle>/rig/<slug>`) carries
`inputs: [{name, label, type, required, placeholder}]` and
`secret_refs: [{alias, host?}]`.

```bash
curl -s -X POST https://rokha.ai/api/rigs/run -H 'content-type: application/json' \
  -d '{"rig":"<slug>","inputs":{"mint":"<mint>","take_profit":"0.1"}}' > run.json
```

- The legacy `input` string still works and fills the **first** declared input.
- Inputs are checked before anything runs: `400` with `missing_input`,
  `unknown_input`, `bad_input` (a `number` that is not a number, `json` that
  does not parse, a `url` that is not http(s)), `input_too_large` or
  `too_many_inputs` (more than 12).
- If you have not saved a key the rig needs, the answer is
  **`409 needs_secret`** with `missing: [{alias, host?, hint}]` — add them in
  Profile → Keys and run again. Anonymous callers have no key vault, so a rig
  with keys needs an account.

MCP twin: `rig_run` with `inputs` (and `wait: true` to get the output back
in the same call).

## 3 · Read what it did — a public rig's runs are public

Poll `GET /api/rigs/runs/<run_id>` until `done` is true (the `poll` block in
`run.json` has the exact URL and header). Each `steps[]` entry has a
`trace_id`.

**A run of a public rig (bound to an active, published rig listing) is
readable by anyone who has its id, with no auth at all.** Share the run id or
a trace id and anyone can curl it:

```bash
curl -s https://rokha.ai/api/rigs/runs/<run_id>     # status, steps, output, traces
curl -s https://rokha.ai/api/traces/<trace_id>      # one trace: {success, data}
```

- The public view **strips the runner's identity**: owner scope, user
  context, session ids, IPs, emails, credential-shaped keys, and the
  runner's identity string wherever it appears (it reads `[runner]`).
- Every answer carries `visibility`: `public` or `private`.
- Your own traces, public or not, come back in full with
  `Authorization: Bearer <token>` alone (no `x-wallet-address` header), or
  the `x-anon-session-id` you ran with.
- Anything else is `404 trace_not_found` / `run_not_found`, the same answer
  as an id that never existed. Unpublish the listing and its runs go private
  again.
- `GET /api/traces` lists **your own** traces (Bearer token) and filters by
  `run_id`, `parent_trace_id`, `harness_id`, `rig_id`, `status`,
  `trace_kind`, `node_id`.

Over MCP, anonymously:

```bash
curl -s -X POST https://rokha.ai/mcp/jsonrpc -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"trace_get","arguments":{"run_id":"<run_id>"}}}'
```

`trace_get` takes `id` (a trace) or `run_id` (the whole run, in the run
door's shape). `trace_search` takes `run_id` plus optional `trace_kind`,
`status`, `node_id`, `parent_trace_id`. Signed in, both read your own traces
plus any public run.

## 4 · Feed a rig your own data

Data attachments are your own JSON, CSV, XML, YAML or text, fed to a run as
fenced **data** (never as instructions). At most 512 KB each, 200 per account.
A wallet sign-in also sends `x-wallet-address: <the wallet in the token>` on
these routes.

| Do | REST |
|---|---|
| List (no content) · create | `GET` · `POST /api/data-attachments` `{name, format, role?, content}` |
| Read (with content) · update · delete | `GET` · `PUT` · `DELETE /api/data-attachments/<id>` |
| Save a run's output as an attachment | `POST /api/data-attachments/from-run` `{trace_id \| run_id, name, role?}` |
| A starter template per format | `GET /api/data-attachments/templates` |

`role` is `input` (default), `test_input`, `expected_output` or `reference`.
Content is parse-checked: a bad file answers `422 parse_failed` with `line`
and `col`. Then run a rig on it: `rig_run` with
`input_attachment: "<attachment id>"` (signed in). A run fed a `test_input`
attachment is marked test data and never earns the proven stamp.

## 5 · Paper trading — real quotes, no money

`POST /api/signet/paper` (Bearer token, signed-in accounts only) with an
`action`. Every fill is priced by a real Jupiter quote and written to your
own ledger; no mandate, no signature, no funds move. No quote means a
refusal, never a made-up price. Every paper answer carries `paper: true`.

```bash
P='https://rokha.ai/api/signet/paper'
H=(-H "authorization: Bearer $JWT" -H 'content-type: application/json')
curl -s "$P" "${H[@]}" -d '{"action":"wallet_activity","address":"<wallet>","limit":10}'
curl -s "$P" "${H[@]}" -d '{"action":"paper_buy","ledger":"copy-1","mint":"<mint>","amount_usd":25,"source_signature":"<their swap sig>"}'
curl -s "$P" "${H[@]}" -d '{"action":"paper_sell","ledger":"copy-1","mint":"<mint>","fraction":0.5,"reason":"take_profit"}'
curl -s "$P" "${H[@]}" -d '{"action":"paper_positions","ledger":"copy-1"}'
curl -s "$P" "${H[@]}" -d '{"action":"paper_reset","ledger":"copy-1"}'
```

- `wallet_activity` returns `swaps: [{signature, time, token_in, token_out,
  source}]` — `token_in` is what the wallet gave, `token_out` what it got.
  `helius_not_configured` means the deployment has no Helius key; it is not
  an empty wallet.
- `paper_buy` takes `amount_usd` or `amount_tokens` (or `buys: [...]`, up to
  20). A `source_signature` already in the ledger is skipped, so a copy-trade
  loop never mirrors the same swap twice.
- `paper_positions` returns `open` (marked at a live quote), `closed`, and
  `totals: {realized_usd, unrealized_usd, open_count, closed_count, win_rate}`.
- A refusal is `422 {paper: true, status: "refused", code, error}`
  (`429` for `rate_limited`).

MCP twins: `signet_wallet_activity`, `signet_paper_buy`, `signet_paper_sell`,
`signet_paper_positions`, `signet_paper_reset`.
