import { ArenaError, parseTime, parseUnits } from './canonical.js';
import { GRADERS } from './graders.js';

export const LIMITS = {
  trials: 12,
  entrants: 256,
  answerBytes: 64 * 1024,
  briefChars: 20000,
  splitRanks: 10,
};

const ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const fail = (message, detail) => {
  throw new ArenaError('bad_spec', message, detail);
};

function checkPass(pass, where) {
  if (pass === undefined) return;
  if (!pass || typeof pass !== 'object') fail(`${where}.pass must be an object`);
  const { min_score: min, top_n: n, top_fraction: f, ...rest } = pass;
  if (Object.keys(rest).length) fail(`${where}.pass has unknown keys`, Object.keys(rest));
  if (min !== undefined && !(typeof min === 'number' && min >= 0 && min <= 1)) fail(`${where}.pass.min_score must be 0..1`);
  if (n !== undefined && !(Number.isInteger(n) && n >= 1)) fail(`${where}.pass.top_n must be a positive integer`);
  if (f !== undefined && !(typeof f === 'number' && f > 0 && f <= 1)) fail(`${where}.pass.top_fraction must be in (0, 1]`);
  if (n !== undefined && f !== undefined) fail(`${where}.pass takes top_n or top_fraction, not both`);
}

export function validateSpec(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) fail('the spec must be a JSON object');
  if (spec.arena_spec !== 1) fail('arena_spec must be 1');
  if (typeof spec.id !== 'string' || !ID.test(spec.id)) fail('id must be lowercase letters, digits, dot, dash or underscore (max 64)');
  if (typeof spec.title !== 'string' || !spec.title.trim() || spec.title.length > 120) fail('title is required (max 120 chars)');

  const b = spec.bounty;
  if (!b || typeof b !== 'object') fail('bounty is required');
  if (typeof b.posted_by !== 'string' || !b.posted_by.trim()) fail('bounty.posted_by is required');
  for (const k of ['brief', 'how_to_win']) {
    if (typeof b[k] !== 'string' || !b[k].trim()) fail(`bounty.${k} is required`);
    if (b[k].length > LIMITS.briefChars) fail(`bounty.${k} is too long`);
  }

  const opens = parseTime(spec.opens_at, 'opens_at');
  const closes = parseTime(spec.closes_at, 'closes_at');
  if (closes <= opens) fail('closes_at must be after opens_at');

  if (!Number.isInteger(spec.max_entrants) || spec.max_entrants < 2 || spec.max_entrants > LIMITS.entrants) {
    fail(`max_entrants must be an integer from 2 to ${LIMITS.entrants}`);
  }
  const minEntrants = spec.min_entrants ?? 2;
  if (!Number.isInteger(minEntrants) || minEntrants < 2 || minEntrants > spec.max_entrants) {
    fail('min_entrants must be an integer from 2 to max_entrants');
  }

  if (!spec.stake || typeof spec.stake !== 'object') fail('stake is required');
  if (parseUnits(spec.stake.amount, 'stake.amount') <= 0n) fail('stake.amount must be greater than zero');
  if (typeof spec.stake.mint !== 'string' || !spec.stake.mint) fail('stake.mint is required');

  if (!spec.pot || typeof spec.pot !== 'object') fail('pot is required');
  if (parseUnits(spec.pot.max, 'pot.max') <= 0n) fail('pot.max must be greater than zero');
  if (typeof spec.pot.asset !== 'string' || !spec.pot.asset) fail('pot.asset is required');
  const split = spec.pot.split ?? [100];
  if (!Array.isArray(split) || !split.length || split.length > LIMITS.splitRanks) fail('pot.split must list 1 to 10 percentages');
  if (!split.every((p) => Number.isInteger(p) && p > 0)) fail('pot.split entries must be positive integers');
  if (split.reduce((a, p) => a + p, 0) !== 100) fail('pot.split must sum to 100');
  if (split.some((p, i) => i > 0 && p > split[i - 1])) fail('pot.split must not pay a lower rank more than a higher one');

  const burn = spec.burn ?? 'all_but_winners';
  if (!['all_but_winners', 'eliminated_only'].includes(burn)) fail('burn must be all_but_winners or eliminated_only');

  if (spec.sealed_entries !== undefined && typeof spec.sealed_entries !== 'boolean') fail('sealed_entries must be true or false');
  if (spec.trials?.some?.((t) => t?.id === 'reveal')) fail('a trial cannot be called reveal');

  if (!Array.isArray(spec.trials) || !spec.trials.length || spec.trials.length > LIMITS.trials) {
    fail(`trials must list 1 to ${LIMITS.trials} trials`);
  }
  const seen = new Set();
  let mechanical = 0;
  spec.trials.forEach((t, i) => {
    const where = `trials[${i}]`;
    if (!t || typeof t !== 'object') fail(`${where} must be an object`);
    if (typeof t.id !== 'string' || !ID.test(t.id)) fail(`${where}.id is invalid`);
    if (seen.has(t.id)) fail(`${where}.id repeats`);
    seen.add(t.id);
    if (typeof t.title !== 'string' || !t.title.trim()) fail(`${where}.title is required`);
    const w = t.weight ?? 1;
    if (!(typeof w === 'number' && w > 0 && w <= 1000)) fail(`${where}.weight must be in (0, 1000]`);
    checkPass(t.pass, where);
    const g = t.grader;
    if (!g || typeof g !== 'object' || !GRADERS[g.kind]) fail(`${where}.grader.kind must be one of ${Object.keys(GRADERS).join(', ')}`);
    GRADERS[g.kind].check(g, `${where}.grader`);
    if (GRADERS[g.kind].basis === 'mechanical') mechanical += 1;
  });
  if (mechanical === 0 && spec.allow_unmechanical_payout !== true) {
    fail('every trial is judged or external: add a mechanical trial, or set allow_unmechanical_payout to true to accept that on the record');
  }

  return {
    ...spec,
    min_entrants: minEntrants,
    burn,
    pot: { ...spec.pot, split },
    trials: spec.trials.map((t) => ({ ...t, weight: t.weight ?? 1 })),
  };
}
