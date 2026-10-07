import { parseTime } from './canonical.js';
import { GRADERS } from './graders.js';
import { validateSpec } from './spec.js';

const HIDDEN = ['answer', 'target', 'expected', 'required', 'cases'];

export function publicTrial(t) {
  const g = { ...t.grader };
  if (g.commitment) for (const k of HIDDEN) delete g[k];
  return { id: t.id, title: t.title, weight: t.weight, pass: t.pass ?? null, grader: g, basis: GRADERS[t.grader.kind].basis };
}

export function board(rawSpec, { entries = [], verdict = null, settlement = null, now, pot_available = null } = {}) {
  const spec = validateSpec(rawSpec);
  const at = parseTime(now, 'now');
  const opens = parseTime(spec.opens_at, 'opens_at');
  const closes = parseTime(spec.closes_at, 'closes_at');
  const phase = verdict ? verdict.status : at < opens ? 'upcoming' : at < closes ? 'open' : 'grading';

  const rows = verdict
    ? verdict.entries.map((e) => ({
        entry_id: e.entry_id,
        entrant: e.entrant,
        agent: e.agent,
        trace_id: e.trace_id,
        status: e.status,
        rank: e.rank ?? null,
        total: e.total_micro === undefined ? null : e.total_micro / 1e6,
        eliminated_at: e.eliminated_at ?? null,
        forfeit: e.forfeit ?? null,
        reject_reason: e.reject_reason ?? null,
        stake_tx: e.stake_tx,
        trials: (e.trials ?? []).map((r) => ({ id: r.id, score: r.score_micro / 1e6, passed: r.passed, detail: r.detail })),
      }))
    : entries.map((e) => ({
        entry_id: e.entry_id,
        entrant: String(e.entrant ?? '').toLowerCase(),
        agent: e.agent ?? null,
        trace_id: null,
        status: 'entered',
        rank: null,
        total: null,
        eliminated_at: null,
        reject_reason: null,
        stake_tx: e.stake_tx,
        trials: [],
      }));

  return {
    arena_board: 1,
    generated_at: now,
    gauntlet: {
      id: spec.id,
      title: spec.title,
      phase,
      reason: verdict?.reason ?? null,
      basis: verdict?.basis ?? null,
      opens_at: spec.opens_at,
      closes_at: spec.closes_at,
      posted_by: spec.bounty.posted_by,
      brief: spec.bounty.brief,
      how_to_win: spec.bounty.how_to_win,
      max_entrants: spec.max_entrants,
      min_entrants: spec.min_entrants,
      burn: spec.burn,
      sealed_entries: spec.sealed_entries === true,
      stake: spec.stake,
      pot: { asset: spec.pot.asset, max: spec.pot.max, split: spec.pot.split, available: pot_available },
      trials: spec.trials.map(publicTrial),
    },
    entries: rows,
    settlement: settlement
      ? { pot: settlement.pot, payouts: settlement.payouts, burns: settlement.burns, refunds: settlement.refunds, totals: settlement.totals, plan_hash: settlement.plan_hash }
      : null,
    proof: verdict ? { spec_hash: verdict.spec_hash, verdict_hash: verdict.verdict_hash, graded_at: verdict.graded_at } : null,
  };
}
