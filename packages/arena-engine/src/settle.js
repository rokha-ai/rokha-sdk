import { ArenaError, hashOf, parseUnits } from './canonical.js';
import { validateSpec } from './spec.js';

const NO_REFUND = new Set(['stake_reused']);

export function settle(rawSpec, verdict, inputs = {}) {
  const spec = validateSpec(rawSpec);
  if (!verdict || verdict.arena_verdict !== 1 || verdict.gauntlet_id !== spec.id) {
    throw new ArenaError('bad_verdict', 'the verdict does not belong to this gauntlet');
  }
  const { verdict_hash: claimed, ...body } = verdict;
  if (hashOf(body) !== claimed) throw new ArenaError('verdict_tampered', 'the verdict does not match its own hash');
  if (verdict.spec_hash !== hashOf(spec)) throw new ArenaError('spec_changed', 'the spec changed after the verdict was sealed');

  const available = parseUnits(inputs.pot_available, 'pot_available');
  const need = parseUnits(spec.stake.amount, 'stake.amount');
  const cap = parseUnits(spec.pot.max, 'pot.max');
  const pot = verdict.status === 'settled' ? (available < cap ? available : cap) : 0n;

  const payouts = [];
  const burns = [];
  const refunds = [];
  const keeps = [];
  let paid = 0n;

  const winners = verdict.entries.filter((e) => e.status === 'winner');
  winners.forEach((e, i) => {
    const amount = (pot * BigInt(spec.pot.split[i])) / 100n;
    paid += amount;
    payouts.push({ entry_id: e.entry_id, entrant: e.entrant, payout_address: e.payout_address ?? null, rank: e.rank, percent: spec.pot.split[i], amount: amount.toString() });
  });

  for (const e of verdict.entries) {
    const staked = parseUnits(e.stake_amount, 'stake_amount');
    const row = { entry_id: e.entry_id, entrant: e.entrant, stake_tx: e.stake_tx };
    if (e.status === 'rejected') {
      if (!NO_REFUND.has(e.reject_reason) && staked > 0n) refunds.push({ ...row, amount: staked.toString(), why: e.reject_reason });
      continue;
    }
    if (e.status === 'void') {
      refunds.push({ ...row, amount: staked.toString(), why: 'gauntlet_void' });
      continue;
    }
    const burned = e.status === 'eliminated' || (e.status === 'survivor' && spec.burn === 'all_but_winners');
    if (burned) burns.push({ ...row, amount: need.toString(), why: e.forfeit ?? (e.status === 'eliminated' ? `eliminated_at:${e.eliminated_at}` : 'did_not_place') });
    else keeps.push({ ...row, amount: need.toString(), why: e.status });
    if (staked > need) refunds.push({ ...row, amount: (staked - need).toString(), why: 'overpaid_stake' });
  }

  const plan = {
    arena_settlement: 1,
    gauntlet_id: spec.id,
    verdict_hash: claimed,
    status: verdict.status,
    pot: { asset: spec.pot.asset, available: available.toString(), cap: cap.toString(), awarded: paid.toString(), rollover: (available - paid).toString() },
    stake: { mint: spec.stake.mint, amount: need.toString() },
    payouts,
    burns,
    keeps,
    refunds,
    totals: {
      burned: burns.reduce((a, b) => a + BigInt(b.amount), 0n).toString(),
      refunded: refunds.reduce((a, b) => a + BigInt(b.amount), 0n).toString(),
    },
  };
  return { ...plan, plan_hash: hashOf(plan) };
}
