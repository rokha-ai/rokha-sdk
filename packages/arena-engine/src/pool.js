import { ArenaError } from './canonical.js';
import { partyAttestation } from './graders.js';

const ENTRY_STATES = new Set(['funded', 'burning', 'burned', 'released']);

// A Rokha pledge pool, read as a gauntlet. The pool is the source of truth for
// WHO entered and WHEN (a funded pledge, stamped by the platform); the pool's
// own terms override anything the rules say about stake, size and timing.
export function fromPool(body) {
  const pool = body?.pool;
  if (!pool || typeof pool !== 'object' || !Array.isArray(body.pledges)) {
    throw new ArenaError('bad_pool', 'that address did not answer with a pledge pool');
  }
  const rules = pool.meta?.arena;
  if (!rules || typeof rules !== 'object') {
    throw new ArenaError('not_a_gauntlet', 'this pledge pool carries no arena rules in its meta');
  }
  const opened = body.pledges.reduce((a, p) => (p.created_at && p.created_at < a ? p.created_at : a), pool.locks_at);
  const spec = {
    ...rules,
    arena_spec: 1,
    id: pool.slug,
    title: rules.title ?? pool.title,
    opens_at: rules.opens_at && rules.opens_at < pool.locks_at ? rules.opens_at : new Date(Date.parse(opened) - 1000).toISOString(),
    closes_at: pool.locks_at,
    max_entrants: pool.max_pledges,
    min_entrants: Math.min(rules.min_entrants ?? 2, pool.max_pledges),
    stake: { ...(rules.stake ?? {}), mint: pool.mint, amount: pool.stake_amount },
    sealed_entries: rules.sealed_entries === true,
  };
  const entries = body.pledges
    .filter((p) => ENTRY_STATES.has(p.status) && p.funded_at)
    .map((p) => {
      const d = p.disclosure && typeof p.disclosure === 'object' ? p.disclosure : null;
      const e = {
        entry_id: p.id,
        entrant: p.pledger,
        agent: typeof d?.agent === 'string' ? d.agent.slice(0, 60) : null,
        submitted_at: p.funded_at,
        stake_tx: p.deposit_address,
        stake_amount: pool.stake_amount,
        payout_address: p.payout_address,
        handle: typeof p.handle === 'string' ? p.handle : null,
      };
      if (spec.sealed_entries) {
        e.commitment = typeof p.memo === 'string' ? p.memo.trim().toLowerCase() : '';
        if (d && d.answers !== undefined && typeof d.salt === 'string') e.reveal = { answers: d.answers, salt: d.salt };
      } else if (d && d.answers && typeof d.answers === 'object') {
        e.answers = d.answers;
      }
      return e;
    });
  const r = pool.result && typeof pool.result === 'object' ? pool.result : null;
  const judge = r?.judge && typeof r.judge === 'object' && typeof r.judge.graded_at === 'string' ? r.judge : null;
  // A hunting-party trial is scored from the party's public proof, which the
  // organiser embeds in the result — so the scores are DERIVED here, by anyone,
  // and an attestation typed in for such a trial is ignored.
  if (judge) {
    const proofs = judge.proofs && typeof judge.proofs === 'object' ? judge.proofs : {};
    const derived = {};
    for (const t of Array.isArray(spec.trials) ? spec.trials : []) {
      if (t?.grader?.kind !== 'hunting_party') continue;
      if (!proofs[t.id]) throw new ArenaError('proof_missing', `trial ${t.id} needs the proof of hunting party ${t.grader.party_id} in result.judge.proofs`);
      derived[t.id] = partyAttestation(t.grader, proofs[t.id], entries);
    }
    judge.attestations = { ...(judge.attestations ?? {}), ...derived };
  }
  return {
    pool_id: pool.id,
    spec,
    entries,
    judge,
    pot_available: typeof r?.pot_available === 'string' ? r.pot_available : null,
    published: r ? { verdict_hash: r.verdict_hash ?? null, outcomes: r.outcomes && typeof r.outcomes === 'object' ? r.outcomes : null } : null,
  };
}
