import { ArenaError, canonical, commitment, hashOf, parseTime, parseUnits } from './canonical.js';
import { GRADERS } from './graders.js';
import { LIMITS, validateSpec } from './spec.js';

const MICRO = 1_000_000;
const toMicro = (score) => Math.round(Math.min(1, Math.max(0, score)) * MICRO);


function admit(spec, rawEntries) {
  if (!Array.isArray(rawEntries)) throw new ArenaError('bad_entries', 'entries must be a list');
  if (rawEntries.length > 10000) throw new ArenaError('bad_entries', 'too many entries in one grading call');
  const opens = parseTime(spec.opens_at, 'opens_at');
  const closes = parseTime(spec.closes_at, 'closes_at');
  const need = parseUnits(spec.stake.amount, 'stake.amount');
  const poster = spec.bounty.posted_by.trim().toLowerCase();

  const ids = new Set();
  const shaped = rawEntries.map((e, i) => {
    if (!e || typeof e !== 'object') throw new ArenaError('bad_entries', `entries[${i}] must be an object`);
    for (const k of ['entry_id', 'entrant', 'submitted_at', 'stake_tx', 'stake_amount']) {
      if (typeof e[k] !== 'string' || !e[k]) throw new ArenaError('bad_entries', `entries[${i}].${k} is required`);
    }
    if (ids.has(e.entry_id)) throw new ArenaError('bad_entries', `entry_id ${e.entry_id} repeats`);
    ids.add(e.entry_id);
    return {
      entry_id: e.entry_id,
      entrant: e.entrant.trim().toLowerCase(),
      agent: typeof e.agent === 'string' ? e.agent : null,
      trace_id: typeof e.trace_id === 'string' ? e.trace_id : null,
      payout_address: typeof e.payout_address === 'string' ? e.payout_address : null,
      handle: typeof e.handle === 'string' ? e.handle : null,
      submitted_at: e.submitted_at,
      at: parseTime(e.submitted_at, `entries[${i}].submitted_at`),
      stake_tx: e.stake_tx,
      stake_amount: e.stake_amount,
      staked: parseUnits(e.stake_amount, `entries[${i}].stake_amount`),
      answers: e.answers && typeof e.answers === 'object' && !Array.isArray(e.answers) ? e.answers : {},
      commitment: typeof e.commitment === 'string' ? e.commitment : null,
      reveal: e.reveal && typeof e.reveal === 'object' ? e.reveal : null,
    };
  });
  shaped.sort((a, b) => a.at - b.at || (a.entry_id < b.entry_id ? -1 : 1));

  const seenEntrant = new Set();
  const seenStake = new Set();
  let admitted = 0;
  for (const e of shaped) {
    let reason = null;
    if (e.entrant === poster) reason = 'poster_cannot_enter';
    else if (e.at < opens) reason = 'before_open';
    else if (e.at >= closes) reason = 'after_close';
    else if (seenStake.has(e.stake_tx)) reason = 'stake_reused';
    else if (e.staked < need) reason = 'stake_short';
    else if (seenEntrant.has(e.entrant)) reason = 'duplicate_entrant';
    else if (admitted >= spec.max_entrants) reason = 'gauntlet_full';
    else if (spec.sealed_entries && !/^[0-9a-f]{64}$/.test(e.commitment ?? '')) reason = 'no_commitment';
    else if (spec.sealed_entries) {
      const r = e.reveal;
      const ok = r && typeof r.salt === 'string' && r.salt.length >= 16 && r.answers && typeof r.answers === 'object' && !Array.isArray(r.answers);
      if (!ok) e.forfeit = 'not_revealed';
      else if (Buffer.byteLength(canonical(r.answers), 'utf8') > LIMITS.answerBytes * spec.trials.length) e.forfeit = 'reveal_too_large';
      else if (commitment(r.answers, r.salt) !== e.commitment) e.forfeit = 'reveal_mismatch';
      e.answers = e.forfeit ? {} : r.answers;
    }
    if (!reason) {
      for (const t of spec.trials) {
        const a = e.answers[t.id];
        if (a !== undefined && Buffer.byteLength(canonical(a), 'utf8') > LIMITS.answerBytes) reason = 'answer_too_large';
      }
    }
    if (reason) {
      e.reject_reason = reason;
    } else {
      admitted += 1;
      seenEntrant.add(e.entrant);
    }
    seenStake.add(e.stake_tx);
  }
  return shaped;
}

function cutSize(pass, alive) {
  if (!pass) return alive;
  if (pass.top_n !== undefined) return Math.min(alive, pass.top_n);
  if (pass.top_fraction !== undefined) return Math.max(1, Math.floor(alive * pass.top_fraction));
  return alive;
}

const byScoreThenTime = (key) => (a, b) => b[key] - a[key] || a.at - b.at || (a.entry_id < b.entry_id ? -1 : 1);

export function grade(rawSpec, rawEntries, inputs = {}) {
  const spec = validateSpec(rawSpec);
  const now = parseTime(inputs.now, 'now');
  if (now < parseTime(spec.closes_at, 'closes_at')) {
    throw new ArenaError('still_open', 'the gauntlet has not closed; grading before close would leak the cut');
  }
  const secrets = inputs.secrets ?? {};
  const attestations = inputs.attestations ?? {};
  const entries = admit(spec, rawEntries);
  const field = entries.filter((e) => !e.reject_reason);

  const bases = new Set(spec.trials.map((t) => GRADERS[t.grader.kind].basis));
  const basis = bases.size === 1 ? [...bases][0] : 'mixed';
  const head = {
    arena_verdict: 1,
    gauntlet_id: spec.id,
    graded_at: inputs.now,
    basis,
    spec_hash: hashOf(spec),
  };

  const view = (e, extra) => ({
    entry_id: e.entry_id,
    entrant: e.entrant,
    agent: e.agent,
    trace_id: e.trace_id,
    payout_address: e.payout_address,
    handle: e.handle,
    submitted_at: e.submitted_at,
    stake_tx: e.stake_tx,
    stake_amount: e.stake_amount,
    ...extra,
  });
  const rejected = entries.filter((e) => e.reject_reason).map((e) => view(e, { status: 'rejected', reject_reason: e.reject_reason }));

  const seal = (body) => {
    const verdict = { ...head, ...body };
    return { ...verdict, verdict_hash: hashOf(verdict) };
  };

  if (field.length < spec.min_entrants) {
    return seal({
      status: 'void',
      reason: `only ${field.length} valid entrant${field.length === 1 ? '' : 's'}; this gauntlet needs ${spec.min_entrants}`,
      entries: [...field.map((e) => view(e, { status: 'void' })), ...rejected],
    });
  }

  for (const e of field) {
    e.trials = [];
    e.alive = !e.forfeit;
    e.eliminated_at = e.forfeit ? 'reveal' : null;
  }
  let weightSum = 0;
  for (const t of spec.trials) {
    const alive = field.filter((e) => e.alive);
    if (!alive.length) break;
    weightSum += t.weight;
    for (const e of alive) {
      const res = GRADERS[t.grader.kind].grade(t.grader, {
        trialId: t.id,
        entryId: e.entry_id,
        answer: e.answers[t.id],
        secret: secrets[t.id],
        attestation: attestations[t.id],
      });
      e.cur = toMicro(res.score);
      e.trials.push({ id: t.id, score_micro: e.cur, weight: t.weight, detail: res.detail, passed: true });
    }
    const min = toMicro(t.pass?.min_score ?? 0);
    const keep = cutSize(t.pass, alive.length);
    [...alive].sort(byScoreThenTime('cur')).forEach((e, i) => {
      const cut = t.pass && (i >= keep || e.cur < min || (e.cur === 0 && (t.pass.top_n !== undefined || t.pass.top_fraction !== undefined)));
      if (cut) {
        e.alive = false;
        e.eliminated_at = t.id;
        e.trials[e.trials.length - 1].passed = false;
      }
    });
  }

  for (const e of field) {
    const sum = e.trials.reduce((a, r) => a + BigInt(r.score_micro) * BigInt(Math.round(r.weight * 1000)), 0n);
    e.total = Number(sum / BigInt(Math.round(weightSum * 1000) || 1));
  }
  const survivors = field.filter((e) => e.alive).sort(byScoreThenTime('total'));
  const paidRanks = spec.pot.split.length;
  const out = [];
  survivors.forEach((e, i) => {
    const wins = i < paidRanks && e.total > 0;
    out.push(view(e, { status: wins ? 'winner' : 'survivor', rank: i + 1, total_micro: e.total, trials: e.trials }));
  });
  const order = new Map([['reveal', -1], ...spec.trials.map((t, i) => [t.id, i])]);
  field
    .filter((e) => !e.alive)
    .sort((a, b) => order.get(b.eliminated_at) - order.get(a.eliminated_at) || byScoreThenTime('total')(a, b))
    .forEach((e) => out.push(view(e, { status: 'eliminated', eliminated_at: e.eliminated_at, ...(e.forfeit ? { forfeit: e.forfeit } : {}), total_micro: e.total, trials: e.trials })));

  const winners = out.filter((e) => e.status === 'winner').length;
  return seal({
    status: winners ? 'settled' : 'no_winner',
    ...(winners ? {} : { reason: 'nobody finished the gauntlet with a score above zero' }),
    entries: [...out, ...rejected],
  });
}
