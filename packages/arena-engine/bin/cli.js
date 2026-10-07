#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { ArenaError, board, commitment, fromPool, grade, settle, validateSpec } from '../src/index.js';

const USAGE = `arena-engine <command> [--flag value ...]

  validate --spec spec.json
  commit   --answer answer.json --salt <16+ chars>
  grade    --spec spec.json --entries entries.json --now <ISO> [--secrets s.json] [--attestations a.json]
  settle   --spec spec.json --verdict verdict.json --pot-available <base units>
  board    --spec spec.json --now <ISO> [--entries e.json] [--verdict v.json] [--settlement s.json] [--pot-available n]
  run      grade + settle + board in one call (flags of all three)
  pool     --pool-url <https url of a Rokha pledge pool> [--now <ISO>]
           or: --pools <https base url> --pool-id <uuid> [--default-id <uuid>]
           Read a gauntlet straight from its pledge pool: the rules are the pool's meta.arena, the entries are
           its funded pledges (memo = sealed-answer fingerprint, disclosure = the reveal), and once the
           organiser has published the pool's result it grades and settles from that.
  show     --bundle-url <https url[#sha256=<hex>]> [--default-url <url>] [--now <ISO>]
           Fetch one bundle {arena_bundle:1, spec, entries, pot_available, judge?:{graded_at, secrets, attestations}}.
           With judge it grades and settles; without, it shows the live board. A #sha256 pin is verified
           against the fetched bytes, and a bundle that judges must be pinned.

Every command prints JSON; --out <file> also writes it. Errors exit 1 with {"error":{"code","message"}}.`;

function flags(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new ArenaError('bad_args', `unexpected argument ${a}`);
    const v = argv[i + 1];
    if (v === undefined || (v.startsWith('--') && v !== '')) throw new ArenaError('bad_args', `${a} needs a value`);
    out[a.slice(2)] = v;
    i += 1;
  }
  return out;
}

function load(path, what) {
  if (!path) throw new ArenaError('bad_args', `--${what} is required`);
  let text;
  try {
    text = readFileSync(path === '-' ? 0 : path, 'utf8');
  } catch {
    throw new ArenaError('unreadable', `cannot read ${what} at ${path}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ArenaError('bad_json', `${what} is not valid JSON`);
  }
}
const maybe = (path, what) => (path ? load(path, what) : undefined);

const MAX_BUNDLE = 5 * 1024 * 1024;

async function fetchBundle(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new ArenaError('bad_args', 'the bundle address is not a URL');
  }
  const local = process.env.ARENA_ALLOW_HTTP === '1' && url.protocol === 'http:' && url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !local) throw new ArenaError('bad_args', 'the bundle address must be https');
  const pin = /^#sha256=([0-9a-f]{64})$/.exec(url.hash)?.[1] ?? null;
  if (url.hash && !pin) throw new ArenaError('bad_args', 'the pin must look like #sha256=<64 hex characters>');
  url.hash = '';
  let res;
  try {
    res = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  } catch {
    throw new ArenaError('bundle_unreachable', 'the bundle could not be fetched');
  }
  if (!res.ok) throw new ArenaError('bundle_unreachable', `the bundle address answered ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_BUNDLE) throw new ArenaError('bundle_too_large', 'the bundle is over 5 MB');
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (pin && pin !== sha) throw new ArenaError('bundle_changed', 'the bundle does not match its pinned fingerprint');
  let bundle;
  try {
    bundle = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new ArenaError('bad_json', 'the bundle is not valid JSON');
  }
  if (!bundle || bundle.arena_bundle !== 1 || !bundle.spec) throw new ArenaError('bad_bundle', 'not an arena bundle (arena_bundle must be 1, with a spec)');
  return { bundle, sha, pinned: !!pin, url: url.toString() };
}

async function pool(f) {
  let address = (f['pool-url'] ?? '').trim() || (f['default-url'] ?? '').trim();
  if (!address && f.pools) {
    const id = ((f['pool-id'] ?? '').trim() || (f['default-id'] ?? '').trim()).toLowerCase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
      throw new ArenaError('bad_args', 'a gauntlet id is a pledge pool uuid');
    }
    address = f.pools + id;
  }
  if (!address) throw new ArenaError('bad_args', 'give a pledge pool address');
  let url;
  try {
    url = new URL(address);
  } catch {
    throw new ArenaError('bad_args', 'the pool address is not a URL');
  }
  const local = process.env.ARENA_ALLOW_HTTP === '1' && url.protocol === 'http:' && url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !local) throw new ArenaError('bad_args', 'the pool address must be https');
  let res;
  try {
    res = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  } catch {
    throw new ArenaError('pool_unreachable', 'the pledge pool could not be fetched');
  }
  if (!res.ok) throw new ArenaError('pool_unreachable', `the pledge pool address answered ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_BUNDLE) throw new ArenaError('bundle_too_large', 'the pledge pool answer is over 5 MB');
  let body;
  try {
    body = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new ArenaError('bad_json', 'the pledge pool answer is not valid JSON');
  }
  const b = fromPool(body);
  const source = { url: url.toString(), pool_id: b.pool_id, pinned: false };
  if (!b.judge) {
    return { board: board(b.spec, { now: f.now ?? new Date().toISOString(), entries: b.entries, pot_available: b.pot_available }), source };
  }
  if (b.pot_available === null) throw new ArenaError('bad_bundle', 'the published result must state pot_available');
  const now = b.judge.graded_at;
  const verdict = grade(b.spec, b.entries, { now, secrets: b.judge.secrets, attestations: b.judge.attestations });
  const settlement = settle(b.spec, verdict, { pot_available: b.pot_available });
  // The public check: does what the organiser published match what the rules
  // and the entries actually produce?
  const burned = new Set(settlement.burns.map((x) => x.entry_id));
  const named = b.published?.outcomes ?? null;
  const check = {
    verdict_hash_matches: b.published?.verdict_hash === verdict.verdict_hash,
    outcomes_match: !!named && Object.entries(named).every(([id, o]) => (o === 'burn') === burned.has(id)) && [...burned].every((id) => named[id] === 'burn'),
  };
  return { verdict, settlement, check, board: board(b.spec, { now, verdict, settlement, pot_available: b.pot_available }), source };
}

async function show(f) {
  const address = (f['bundle-url'] ?? '').trim() || (f['default-url'] ?? '').trim();
  if (!address) throw new ArenaError('bad_args', 'give a bundle address');
  const { bundle, sha, pinned, url } = await fetchBundle(address);
  const entries = bundle.entries ?? [];
  const pot = bundle.pot_available ?? null;
  const source = { url, sha256: sha, pinned };
  if (!bundle.judge) {
    return { board: board(bundle.spec, { now: f.now ?? new Date().toISOString(), entries, pot_available: pot }), source };
  }
  if (!pinned) throw new ArenaError('bundle_unpinned', 'a bundle that judges must be fetched with its #sha256 pin');
  if (pot === null) throw new ArenaError('bad_bundle', 'a bundle that judges must state pot_available');
  const now = bundle.judge.graded_at;
  const verdict = grade(bundle.spec, entries, { now, secrets: bundle.judge.secrets, attestations: bundle.judge.attestations });
  const settlement = settle(bundle.spec, verdict, { pot_available: pot });
  return { verdict, settlement, board: board(bundle.spec, { now, verdict, settlement, pot_available: pot }), source };
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === '--help' || cmd === 'help') {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  const f = flags(rest);
  let result;
  if (cmd === 'validate') {
    const spec = validateSpec(load(f.spec, 'spec'));
    result = { ok: true, id: spec.id, trials: spec.trials.length };
  } else if (cmd === 'commit') {
    result = { commitment: commitment(load(f.answer, 'answer'), f.salt) };
  } else if (cmd === 'grade') {
    result = grade(load(f.spec, 'spec'), load(f.entries, 'entries'), {
      now: f.now,
      secrets: maybe(f.secrets, 'secrets'),
      attestations: maybe(f.attestations, 'attestations'),
    });
  } else if (cmd === 'settle') {
    result = settle(load(f.spec, 'spec'), load(f.verdict, 'verdict'), { pot_available: f['pot-available'] });
  } else if (cmd === 'board') {
    result = board(load(f.spec, 'spec'), {
      now: f.now,
      entries: maybe(f.entries, 'entries'),
      verdict: maybe(f.verdict, 'verdict') ?? null,
      settlement: maybe(f.settlement, 'settlement') ?? null,
      pot_available: f['pot-available'] ?? null,
    });
  } else if (cmd === 'pool') {
    result = await pool(f);
  } else if (cmd === 'show') {
    result = await show(f);
  } else if (cmd === 'run') {
    const spec = load(f.spec, 'spec');
    const entries = load(f.entries, 'entries');
    const verdict = grade(spec, entries, { now: f.now, secrets: maybe(f.secrets, 'secrets'), attestations: maybe(f.attestations, 'attestations') });
    const settlement = settle(spec, verdict, { pot_available: f['pot-available'] });
    result = { verdict, settlement, board: board(spec, { now: f.now, verdict, settlement, pot_available: f['pot-available'] }) };
  } else {
    throw new ArenaError('bad_args', `unknown command ${cmd}`);
  }
  const text = JSON.stringify(result, null, 2);
  if (f.out) writeFileSync(f.out, text);
  process.stdout.write(`${text}\n`);
}

main().catch((err) => {
  const code = err instanceof ArenaError ? err.code : 'internal';
  const text = JSON.stringify({ error: { code, message: err.message, ...(err.detail !== undefined ? { detail: err.detail } : {}) } });
  const at = process.argv.indexOf('--out');
  if (at > 0 && process.argv[at + 1]) {
    try {
      writeFileSync(process.argv[at + 1], text);
    } catch {}
  }
  process.stdout.write(`${text}\n`);
  process.exit(1);
});
