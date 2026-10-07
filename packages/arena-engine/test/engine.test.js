import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { board, commitment, grade, settle, validateSpec } from '../src/index.js';
import { partyAttestation } from '../src/graders.js';

const SALT = 'a-long-random-salt-0001';
const HIDDEN = ['mint-a', 'mint-b', 'mint-c', 'mint-d'];
const NOW = '2026-11-01T13:00:00Z';

const spec = (over = {}) => ({
  arena_spec: 1,
  id: 'g-0001',
  title: 'Find the four planted mints',
  bounty: { posted_by: 'poster', brief: 'Four of these forty mints share a deployer. Name them.', how_to_win: 'Name the most planted mints, then answer fastest.' },
  opens_at: '2026-11-01T00:00:00Z',
  closes_at: '2026-11-01T12:00:00Z',
  max_entrants: 4,
  stake: { mint: 'ARENAmint', amount: '1000000' },
  pot: { asset: 'SOL', max: '2000000000', split: [70, 30] },
  trials: [
    { id: 'find', title: 'Find them', grader: { kind: 'set_match', commitment: commitment(HIDDEN, SALT) }, pass: { top_n: 3, min_score: 0.4 } },
    { id: 'speed', title: 'Answer fast', weight: 0.5, grader: { kind: 'metric', source: 'arena:trace', direction: 'lower', floor: 0, ceiling: 60000 } },
  ],
  ...over,
});
const entry = (id, entrant, minute, find, over = {}) => ({
  entry_id: id,
  entrant,
  agent: `${entrant}-bot`,
  submitted_at: `2026-11-01T01:${String(minute).padStart(2, '0')}:00Z`,
  stake_tx: `sig-${id}`,
  stake_amount: '1000000',
  answers: { find },
  ...over,
});
const field = () => [
  entry('e1', 'ann', 1, ['mint-a', 'mint-b', 'mint-c', 'mint-d']),
  entry('e2', 'bob', 2, ['mint-a', 'mint-b', 'mint-c', 'mint-d']),
  entry('e3', 'cat', 3, ['mint-a', 'mint-b', 'wrong']),
  entry('e4', 'dan', 4, ['nope']),
];
const inputs = (over = {}) => ({
  now: NOW,
  secrets: { find: { answer: HIDDEN, salt: SALT } },
  attestations: { speed: { source: 'arena:trace', scores: { e1: 30000, e2: 6000, e3: 12000, e4: 100 } } },
  ...over,
});
const code = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.code;
  }
  return null;
};
const statusOf = (v, id) => v.entries.find((e) => e.entry_id === id);

test('a gauntlet eliminates, ranks and seals a verdict', () => {
  const v = grade(spec(), field(), inputs());
  assert.equal(v.status, 'settled');
  assert.equal(v.basis, 'mechanical');
  assert.equal(statusOf(v, 'e4').status, 'eliminated');
  assert.equal(statusOf(v, 'e4').eliminated_at, 'find');
  assert.equal(statusOf(v, 'e2').rank, 1);
  assert.equal(statusOf(v, 'e1').rank, 2);
  assert.equal(statusOf(v, 'e3').status, 'survivor');
  assert.match(v.verdict_hash, /^[0-9a-f]{64}$/);
});

test('the verdict does not depend on the order entries arrive in', () => {
  const a = grade(spec(), field(), inputs());
  const b = grade(spec(), field().reverse(), inputs());
  assert.equal(a.verdict_hash, b.verdict_hash);
});

test('an eliminated entrant is never graded on later trials', () => {
  const v = grade(spec(), field(), inputs({ attestations: { speed: { source: 'arena:trace', scores: { e1: 1, e2: 2, e3: 3 } } } }));
  assert.equal(statusOf(v, 'e4').trials.length, 1);
});

test('entries that break the rules are refused, each with its reason', () => {
  const extra = [
    entry('e5', 'ann', 5, HIDDEN),
    entry('e6', 'poster', 6, HIDDEN),
    entry('e7', 'eve', 7, HIDDEN, { submitted_at: '2026-11-01T12:00:00Z' }),
    entry('e8', 'fay', 8, HIDDEN, { stake_amount: '999999' }),
    entry('e9', 'gus', 9, HIDDEN, { stake_tx: 'sig-e1' }),
    entry('e10', 'hal', 10, HIDDEN),
    entry('e11', 'early', 0, HIDDEN, { submitted_at: '2026-10-31T23:59:59Z' }),
  ];
  const v = grade(spec(), [...field(), ...extra], inputs());
  const why = (id) => statusOf(v, id).reject_reason;
  assert.equal(why('e5'), 'duplicate_entrant');
  assert.equal(why('e6'), 'poster_cannot_enter');
  assert.equal(why('e7'), 'after_close');
  assert.equal(why('e8'), 'stake_short');
  assert.equal(why('e9'), 'stake_reused');
  assert.equal(why('e10'), 'gauntlet_full');
  assert.equal(why('e11'), 'before_open');
});

test('an oversized answer is refused before any grader reads it', () => {
  const v = grade(spec(), [...field().slice(0, 3), entry('e4', 'dan', 4, ['x'.repeat(70000)])], inputs());
  assert.equal(statusOf(v, 'e4').reject_reason, 'answer_too_large');
});

test('grading refuses to run before the gauntlet closes', () => {
  assert.equal(code(() => grade(spec(), field(), inputs({ now: '2026-11-01T11:59:59Z' }))), 'still_open');
});

test('a hidden answer must be revealed, and must match its commitment', () => {
  assert.equal(code(() => grade(spec(), field(), inputs({ secrets: {} }))), 'reveal_missing');
  assert.equal(code(() => grade(spec(), field(), inputs({ secrets: { find: { answer: ['mint-a'], salt: SALT } } }))), 'reveal_mismatch');
});

test('a missing or mis-sourced measurement stops the verdict; it is never scored as zero', () => {
  assert.equal(code(() => grade(spec(), field(), inputs({ attestations: {} }))), 'attestation_missing');
  assert.equal(code(() => grade(spec(), field(), inputs({ attestations: { speed: { source: 'someone-else', scores: {} } } }))), 'attestation_source');
  assert.equal(code(() => grade(spec(), field(), inputs({ attestations: { speed: { source: 'arena:trace', scores: { e1: 1, e2: 2 } } } }))), 'attestation_missing');
});

test('too few valid entrants voids the gauntlet and refunds every stake', () => {
  const v = grade(spec(), field().slice(0, 1), inputs());
  assert.equal(v.status, 'void');
  const s = settle(spec(), v, { pot_available: '5000000000' });
  assert.equal(s.pot.awarded, '0');
  assert.equal(s.pot.rollover, '5000000000');
  assert.equal(s.burns.length, 0);
  assert.deepEqual(s.refunds.map((r) => r.why), ['gauntlet_void']);
});

test('settlement caps the pot, rolls the rest over, and burns the losers', () => {
  const v = grade(spec(), field(), inputs());
  const s = settle(spec(), v, { pot_available: '5000000001' });
  assert.equal(s.pot.awarded, '2000000000');
  assert.equal(s.pot.rollover, '3000000001');
  assert.deepEqual(s.payouts.map((p) => [p.entrant, p.amount]), [['bob', '1400000000'], ['ann', '600000000']]);
  assert.deepEqual(s.burns.map((b) => b.entrant).sort(), ['cat', 'dan']);
  assert.equal(s.totals.burned, '2000000');
});

test('a pot smaller than the cap pays out what is there and never more', () => {
  const v = grade(spec(), field(), inputs());
  const s = settle(spec(), v, { pot_available: '101' });
  const paid = s.payouts.reduce((a, p) => a + BigInt(p.amount), 0n);
  assert.equal(paid + BigInt(s.pot.rollover), 101n);
  assert.ok(paid <= 101n);
});

test('eliminated_only lets finishers keep their stake', () => {
  const sp = spec({ burn: 'eliminated_only' });
  const s = settle(sp, grade(sp, field(), inputs()), { pot_available: '1000' });
  assert.deepEqual(s.burns.map((b) => b.entrant), ['dan']);
  assert.ok(s.keeps.some((k) => k.entrant === 'cat'));
});

test('refused entries get their stake back, except a reused stake', () => {
  const extra = [entry('e8', 'fay', 8, HIDDEN, { stake_amount: '999999' }), entry('e9', 'gus', 9, HIDDEN, { stake_tx: 'sig-e1' })];
  const s = settle(spec(), grade(spec(), [...field(), ...extra], inputs()), { pot_available: '1000' });
  assert.ok(s.refunds.some((r) => r.entrant === 'fay' && r.amount === '999999'));
  assert.ok(!s.refunds.some((r) => r.entrant === 'gus'));
});

test('an overpaid stake burns only the stake and refunds the excess', () => {
  const es = field();
  es[3].stake_amount = '1500000';
  const s = settle(spec(), grade(spec(), es, inputs()), { pot_available: '1000' });
  assert.equal(s.burns.find((b) => b.entrant === 'dan').amount, '1000000');
  assert.equal(s.refunds.find((r) => r.entrant === 'dan').amount, '500000');
});

test('settlement refuses a verdict that was edited, or a spec that changed', () => {
  const v = grade(spec(), field(), inputs());
  const forged = { ...v, entries: v.entries.map((e) => (e.entry_id === 'e3' ? { ...e, status: 'winner' } : e)) };
  assert.equal(code(() => settle(spec(), forged, { pot_available: '1' })), 'verdict_tampered');
  assert.equal(code(() => settle(spec({ pot: { asset: 'SOL', max: '9', split: [100] } }), v, { pot_available: '1' })), 'spec_changed');
});

test('when nobody scores, nobody is paid and the pot rolls over', () => {
  const sp = spec({ trials: [spec().trials[0]] });
  const v = grade(sp, [entry('e1', 'ann', 1, ['no']), entry('e2', 'bob', 2, ['nope'])], inputs({ attestations: {} }));
  assert.equal(v.status, 'no_winner');
  const s = settle(sp, v, { pot_available: '777' });
  assert.equal(s.payouts.length, 0);
  assert.equal(s.pot.rollover, '777');
  assert.equal(s.burns.length, 2);
});

test('a gauntlet with only judged or external trials is refused unless it says so on the record', () => {
  const judged = { trials: [{ id: 'taste', title: 'Best write-up', grader: { kind: 'judge', rubric: 'Clear, correct and complete beats clever.' } }] };
  assert.equal(code(() => validateSpec(spec(judged))), 'bad_spec');
  const sp = spec({ ...judged, allow_unmechanical_payout: true });
  const v = grade(sp, field(), inputs({ attestations: { taste: { source: 'judge', scores: { e1: 0.9, e2: 0.4, e3: 0.2, e4: 0.1 } } } }));
  assert.equal(v.basis, 'judged');
  assert.equal(statusOf(v, 'e1').rank, 1);
});

test('an outside scorer must stay inside 0 to 1', () => {
  const sp = spec({ trials: [...spec().trials, { id: 'net', title: 'Subnet score', grader: { kind: 'external', source: 'bittensor:sn1' } }] });
  const at = { ...inputs().attestations, net: { source: 'bittensor:sn1', scores: { e1: 0.5, e2: 1.2, e3: 0.1 } } };
  assert.equal(code(() => grade(sp, field(), inputs({ attestations: at }))), 'attestation_range');
});

test('bad specs are refused in words', () => {
  assert.equal(code(() => validateSpec(spec({ pot: { asset: 'SOL', max: '1', split: [60, 30] } }))), 'bad_spec');
  assert.equal(code(() => validateSpec(spec({ pot: { asset: 'SOL', max: '1', split: [30, 70] } }))), 'bad_spec');
  assert.equal(code(() => validateSpec(spec({ closes_at: '2026-10-01T00:00:00Z' }))), 'bad_spec');
  assert.equal(code(() => validateSpec(spec({ stake: { mint: 'x', amount: '1.5' } }))), 'bad_amount');
  assert.equal(code(() => validateSpec(spec({ trials: [{ id: 't', title: 't', grader: { kind: 'exact', answer: 'a', commitment: 'b' } }] }))), 'bad_spec');
});

test('the board never shows a committed answer, before or after grading', () => {
  const open = board(spec(), { now: '2026-11-01T06:00:00Z', entries: field() });
  assert.equal(open.gauntlet.phase, 'open');
  assert.ok(!JSON.stringify(open).includes('mint-d'));
  assert.equal(open.entries.every((e) => e.status === 'entered'), true);
  const v = grade(spec(), field(), inputs());
  const done = board(spec(), { now: NOW, verdict: v, settlement: settle(spec(), v, { pot_available: '10' }) });
  assert.equal(done.gauntlet.phase, 'settled');
  assert.equal(done.proof.verdict_hash, v.verdict_hash);
});

test('the command line runs a whole gauntlet and fails closed with a code', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-'));
  const put = (name, v) => {
    const p = join(dir, name);
    writeFileSync(p, JSON.stringify(v));
    return p;
  };
  const cli = join(import.meta.dirname, '..', 'bin', 'cli.js');
  const args = ['run', '--spec', put('spec.json', spec()), '--entries', put('entries.json', field()), '--now', NOW, '--pot-available', '3000000000',
    '--secrets', put('secrets.json', inputs().secrets), '--attestations', put('att.json', inputs().attestations)];
  const out = JSON.parse(execFileSync('node', [cli, ...args], { encoding: 'utf8' }));
  assert.equal(out.verdict.status, 'settled');
  assert.equal(out.settlement.pot.awarded, '2000000000');
  assert.equal(out.board.gauntlet.phase, 'settled');
  let failed = null;
  try {
    execFileSync('node', [cli, 'grade', '--spec', put('spec.json', spec()), '--entries', put('entries.json', field()), '--now', NOW], { encoding: 'utf8' });
  } catch (e) {
    failed = JSON.parse(e.stdout);
  }
  assert.equal(failed.error.code, 'reveal_missing');
});

test('sealed entries: an unrevealed or altered answer forfeits the stake, and cannot void the gauntlet', () => {
  const sp = spec({ sealed_entries: true, trials: [spec().trials[0]] });
  const salt = 'entrant-salt-000001';
  const sealed = (id, who, minute, answers, over = {}) => ({
    ...entry(id, who, minute, undefined),
    answers: undefined,
    commitment: commitment(answers, salt),
    reveal: { answers, salt },
    ...over,
  });
  const es = [
    sealed('e1', 'ann', 1, { find: HIDDEN }),
    sealed('e2', 'bob', 2, { find: ['mint-a'] }, { reveal: undefined }),
    sealed('e3', 'cat', 3, { find: ['mint-a'] }, { reveal: { answers: { find: HIDDEN }, salt } }),
    { ...entry('e4', 'dan', 4, HIDDEN) },
  ];
  const v = grade(sp, es, inputs({ attestations: {} }));
  assert.equal(v.status, 'settled');
  assert.equal(statusOf(v, 'e1').status, 'winner');
  assert.equal(statusOf(v, 'e2').forfeit, 'not_revealed');
  assert.equal(statusOf(v, 'e3').forfeit, 'reveal_mismatch');
  assert.equal(statusOf(v, 'e4').reject_reason, 'no_commitment');
  const s = settle(sp, v, { pot_available: '100' });
  assert.deepEqual(s.burns.map((b) => [b.entrant, b.why]), [['bob', 'not_revealed'], ['cat', 'reveal_mismatch']]);
  assert.ok(s.refunds.some((r) => r.entrant === 'dan'));
});

test('show: a judging bundle must be pinned, and a changed bundle is refused', async () => {
  const { createServer } = await import('node:http');
  const { createHash } = await import('node:crypto');
  const { execFile } = await import('node:child_process');
  const cli = join(import.meta.dirname, '..', 'bin', 'cli.js');
  const live = JSON.stringify({ arena_bundle: 1, spec: spec(), entries: field(), pot_available: '3000000000' });
  const judged = JSON.stringify({ arena_bundle: 1, spec: spec(), entries: field(), pot_available: '3000000000', judge: { graded_at: NOW, ...inputs() } });
  const server = createServer((req, res) => res.end(req.url === '/live' ? live : judged)).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const run = (url) => new Promise((resolve) => {
    execFile('node', [cli, 'show', '--bundle-url', url, '--now', '2026-11-01T06:00:00Z'], { env: { ...process.env, ARENA_ALLOW_HTTP: '1' } }, (_e, stdout) => resolve(JSON.parse(stdout)));
  });
  try {
    assert.equal((await run(`${base}/live`)).board.gauntlet.phase, 'open');
    assert.equal((await run(`${base}/judged`)).error.code, 'bundle_unpinned');
    assert.equal((await run(`${base}/judged#sha256=${'0'.repeat(64)}`)).error.code, 'bundle_changed');
    const pin = createHash('sha256').update(judged).digest('hex');
    const ok = await run(`${base}/judged#sha256=${pin}`);
    assert.equal(ok.verdict.status, 'settled');
    assert.equal(ok.source.sha256, pin);
    assert.equal((await run('http://example.com/x')).error.code, 'bad_args');
  } finally {
    server.close();
  }
});

test('a Rokha pledge pool reads as a sealed gauntlet, and its published result settles it', async () => {
  const { fromPool } = await import('../src/index.js');
  const salt = 'entrant-salt-000001';
  const rules = { bounty: spec().bounty, pot: spec().pot, trials: [spec().trials[0]], sealed_entries: true, stake: { symbol: 'ARENA', decimals: 6 } };
  const pledge = (n, who, status, answers, disclosed = true) => ({
    id: `p${n}`, pledger: who, status, deposit_address: `dep${n}`, payout_address: `pay${n}`,
    memo: commitment(answers, salt), disclosure: disclosed ? { agent: `${who}-bot`, answers, salt } : null,
    funded_at: `2026-11-01T0${n}:00:00Z`, created_at: `2026-11-01T0${n}:00:00Z`,
  });
  const body = {
    pool: { id: 'pool-uuid', slug: 'g-0001', title: 'Pool title', mint: 'ARENAmint', stake_amount: '1000000', max_pledges: 8,
      locks_at: '2026-11-01T12:00:00Z', release_at: '2026-11-02T12:00:00Z', meta: { arena: rules }, result: null },
    pledges: [
      pledge(1, 'aaaa', 'funded', { find: HIDDEN }),
      pledge(2, 'bbbb', 'funded', { find: ['mint-a'] }, false),
      { ...pledge(3, 'cccc', 'pending', { find: HIDDEN }), funded_at: null },
      { ...pledge(4, 'dddd', 'withdrawn', { find: HIDDEN }) },
    ],
  };
  const live = fromPool(body);
  assert.equal(live.judge, null);
  assert.deepEqual(live.entries.map((e) => e.entry_id), ['p1', 'p2']);
  assert.equal(live.spec.closes_at, '2026-11-01T12:00:00Z');
  assert.equal(live.spec.stake.amount, '1000000');

  body.pool.result = { pot_available: '900', judge: { graded_at: NOW, secrets: inputs().secrets } };
  const done = fromPool(body);
  const v = grade(done.spec, done.entries, { now: done.judge.graded_at, secrets: done.judge.secrets });
  assert.equal(v.status, 'settled');
  const s = settle(done.spec, v, { pot_available: done.pot_available });
  assert.equal(s.payouts[0].payout_address, 'pay1');
  assert.deepEqual(s.burns.map((b) => [b.entry_id, b.why]), [['p2', 'not_revealed']]);

  assert.throws(() => fromPool({ pool: { meta: {} }, pledges: [] }), (e) => e.code === 'not_a_gauntlet');
  assert.throws(() => fromPool({}), (e) => e.code === 'bad_pool');
});

test('a hunting-party trial scores from the party proof, matched on the platform-stamped handle only', async () => {
  const { fromPool, partyAttestation } = await import('../src/index.js');
  const g = { kind: 'hunting_party', party_id: 'hp-7', metric: 'attributed_runs', floor: 0, ceiling: 10 };
  const proof = { party_id: 'hp-7', participants: [{ handle: 'Ann', attributed_runs: 8 }, { handle: 'mallory', metrics: { attributed_runs: 10 } }] };
  const es = [{ entry_id: 'p1', handle: 'ann' }, { entry_id: 'p2', handle: null, disclosure: { handle: 'mallory' } }, { entry_id: 'p3', handle: 'nobody' }];
  assert.deepEqual(partyAttestation(g, proof, es).scores, { p1: 8, p2: 0, p3: 0 });
  assert.throws(() => partyAttestation(g, { party_id: 'other', participants: [] }, es), (e) => e.code === 'bad_proof');
  assert.throws(() => partyAttestation(g, {}, es), (e) => e.code === 'bad_proof');

  const rules = { bounty: spec().bounty, pot: spec().pot, trials: [{ id: 'hunt', title: 'Bring runs', grader: g }] };
  const pledge = (n, handle) => ({ id: `p${n}`, pledger: `f${n}`, handle, status: 'funded', deposit_address: `d${n}`, payout_address: `pay${n}`, memo: '',
    disclosure: { handle: 'ann' }, funded_at: `2026-11-01T0${n}:00:00Z`, created_at: `2026-11-01T0${n}:00:00Z` });
  const body = { pool: { id: 'x', slug: 'g-hunt', title: 'Hunt', mint: 'M', stake_amount: '5', max_pledges: 4, locks_at: '2026-11-01T12:00:00Z',
    meta: { arena: rules }, result: { pot_available: '100', judge: { graded_at: NOW, attestations: { hunt: { source: 'rokha:party:hp-7:attributed_runs', scores: { p2: 999 } } }, proofs: { hunt: proof } } } },
    pledges: [pledge(1, 'ann'), pledge(2, null)] };
  const b = fromPool(body);
  const v = grade(b.spec, b.entries, { now: b.judge.graded_at, attestations: b.judge.attestations });
  assert.equal(v.entries.find((e) => e.entry_id === 'p1').status, 'winner');
  assert.equal(v.entries.find((e) => e.entry_id === 'p2').total_micro, 0);
  delete body.pool.result.judge.proofs;
  assert.throws(() => fromPool(body), (e) => e.code === 'proof_missing');
});

test('a hunting-party trial scores from the proof shape Rokha serves (GET /api/hunting-parties/:id/proof)', () => {
  const proof = {
    party_id: 'scout-weather-data-mcp-servers',
    id: 41,
    participants: [
      { handle: 'alice', metrics: { listings_created: 7, total: 7, share_bps: 0 } },
      { handle: null, metrics: { listings_created: 3, total: 3, share_bps: 0 } },
      { handle: 'Bob', metrics: { listings_created: 2, total: 2, share_bps: 0 } },
    ],
  };
  const g = { kind: 'hunting_party', party_id: 'scout-weather-data-mcp-servers', metric: 'listings_created', floor: 0, ceiling: 10 };
  const entries = [
    { entry_id: 'e1', handle: 'alice' },
    { entry_id: 'e2', handle: 'bob' },
    { entry_id: 'e3', handle: 'mallory' },
    { entry_id: 'e4', handle: null },
  ];
  const a = partyAttestation(g, proof, entries);
  assert.equal(a.source, 'rokha:party:scout-weather-data-mcp-servers:listings_created');
  assert.deepEqual(a.scores, { e1: 7, e2: 2, e3: 0, e4: 0 });
  assert.throws(() => partyAttestation({ ...g, party_id: 'another-party' }, proof, entries));
});
