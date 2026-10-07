import { ArenaError, canonical, commitment } from './canonical.js';

const bad = (where, message) => {
  throw new ArenaError('bad_spec', `${where}: ${message}`);
};
const HEX64 = /^[0-9a-f]{64}$/;
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export const partySource = (g) => `rokha:party:${g.party_id}:${g.metric}`;

// One trial's scores out of a hunting-party proof. An entrant is matched by the
// HANDLE THE PLATFORM STAMPED on their pledge, never by anything they wrote;
// an entrant who is not in the proof did nothing in the party, which is 0.
export function partyAttestation(g, proof, entries) {
  const list = Array.isArray(proof?.participants) ? proof.participants : null;
  if (!list) throw new ArenaError('bad_proof', `the proof for hunting party ${g.party_id} lists no participants`);
  if (proof.party_id !== undefined && String(proof.party_id) !== g.party_id) {
    throw new ArenaError('bad_proof', `that proof is for party ${String(proof.party_id)}, not ${g.party_id}`);
  }
  const byHandle = new Map();
  for (const p of list) {
    const h = typeof p?.handle === 'string' ? p.handle.trim().toLowerCase() : '';
    const v = [p?.[g.metric], p?.metrics?.[g.metric], p?.outcomes?.[g.metric]].find((x) => typeof x === 'number' && Number.isFinite(x));
    if (h && v !== undefined && !byHandle.has(h)) byHandle.set(h, v);
  }
  const scores = {};
  for (const e of entries) {
    const h = typeof e.handle === 'string' ? e.handle.trim().toLowerCase() : '';
    scores[e.entry_id] = (h && byHandle.get(h)) || 0;
  }
  return { source: partySource(g), scores };
}

export function norm(value, caseSensitive = false) {
  const s = String(value).normalize('NFKC').replace(/\s+/g, ' ').trim();
  return caseSensitive ? s : s.toLowerCase();
}

function needKeyOrCommitment(g, where, key, test, describe) {
  const has = g[key] !== undefined;
  const hasC = g.commitment !== undefined;
  if (has === hasC) bad(where, `give ${key} (public) or commitment (hidden until grading), exactly one`);
  if (hasC && !(typeof g.commitment === 'string' && HEX64.test(g.commitment))) bad(where, 'commitment must be 64 lowercase hex characters');
  if (has && !test(g[key])) bad(where, `${key} must be ${describe}`);
}

function revealed(g, key, ctx, test, describe) {
  if (g.commitment === undefined) return g[key];
  const s = ctx.secret;
  if (!s || typeof s !== 'object' || s.answer === undefined || typeof s.salt !== 'string') {
    throw new ArenaError('reveal_missing', `trial ${ctx.trialId} is committed and its answer was not revealed`);
  }
  if (commitment(s.answer, s.salt) !== g.commitment) {
    throw new ArenaError('reveal_mismatch', `trial ${ctx.trialId}: the revealed answer does not match the published commitment`);
  }
  if (!test(s.answer)) {
    throw new ArenaError('reveal_mismatch', `trial ${ctx.trialId}: the revealed answer must be ${describe}`);
  }
  return s.answer;
}

function attested(ctx, wantSource) {
  const a = ctx.attestation;
  if (!a || typeof a !== 'object' || !a.scores || typeof a.scores !== 'object') {
    throw new ArenaError('attestation_missing', `trial ${ctx.trialId} needs scores from ${wantSource} and none were supplied`);
  }
  if (a.source !== wantSource) {
    throw new ArenaError('attestation_source', `trial ${ctx.trialId} expects scores from ${wantSource}, got ${String(a.source)}`);
  }
  const v = a.scores[ctx.entryId];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new ArenaError('attestation_missing', `trial ${ctx.trialId} has no score for entry ${ctx.entryId} from ${wantSource}`);
  }
  return v;
}

const isScalar = (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
const sameValue = (a, b, cs) => (isScalar(a) && isScalar(b) ? norm(a, cs) === norm(b, cs) : canonical(a ?? null) === canonical(b ?? null));
const asNumber = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && /^\s*-?\d+(\.\d+)?([eE][-+]?\d+)?\s*$/.test(v)) return Number(v);
  return null;
};
const isStringList = (v) => Array.isArray(v) && v.length > 0 && v.length <= 1000 && v.every(isScalar);
const isFlatObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0 && Object.keys(v).length <= 200;
const isCases = (v) =>
  Array.isArray(v) && v.length > 0 && v.length <= 500 &&
  v.every((c) => c && typeof c === 'object' && typeof c.id === 'string' && c.expected !== undefined &&
    (c.tolerance === undefined || (typeof c.tolerance === 'number' && c.tolerance > 0))) &&
  new Set(v.map((c) => c.id)).size === v.length;

function pathGet(obj, path) {
  let cur = obj;
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object' || !Object.hasOwn(cur, part)) return undefined;
    cur = cur[part];
  }
  return cur;
}

export const GRADERS = {
  exact: {
    basis: 'mechanical',
    check: (g, w) => needKeyOrCommitment(g, w, 'answer', (v) => v !== null, 'a JSON value'),
    grade(g, ctx) {
      const want = revealed(g, 'answer', ctx, (v) => v !== null && v !== undefined, 'a JSON value');
      const hit = ctx.answer !== undefined && sameValue(ctx.answer, want, g.case_sensitive === true);
      return { score: hit ? 1 : 0, detail: hit ? 'matched' : 'did not match' };
    },
  },
  numeric: {
    basis: 'mechanical',
    check(g, w) {
      needKeyOrCommitment(g, w, 'target', (v) => typeof v === 'number' && Number.isFinite(v), 'a finite number');
      if (!(typeof g.tolerance === 'number' && g.tolerance > 0)) bad(w, 'tolerance must be a number greater than zero');
    },
    grade(g, ctx) {
      const target = revealed(g, 'target', ctx, (v) => typeof v === 'number' && Number.isFinite(v), 'a finite number');
      const x = asNumber(ctx.answer);
      if (x === null) return { score: 0, detail: 'answer is not a number' };
      const off = Math.abs(x - target);
      return { score: clamp01(1 - off / g.tolerance), detail: `off by ${off} (tolerance ${g.tolerance})` };
    },
  },
  set_match: {
    basis: 'mechanical',
    check: (g, w) => needKeyOrCommitment(g, w, 'expected', isStringList, 'a list of 1 to 1000 strings or numbers'),
    grade(g, ctx) {
      const cs = g.case_sensitive === true;
      const want = new Set(revealed(g, 'expected', ctx, isStringList, 'a list of strings or numbers').map((v) => norm(v, cs)));
      if (!Array.isArray(ctx.answer) || ctx.answer.length > 1000) return { score: 0, detail: 'answer is not a list of at most 1000 items' };
      const got = new Set(ctx.answer.filter(isScalar).map((v) => norm(v, cs)));
      let hit = 0;
      for (const v of got) if (want.has(v)) hit += 1;
      if (!hit) return { score: 0, detail: `0 of ${want.size} found` };
      const precision = hit / got.size;
      const recall = hit / want.size;
      return { score: (2 * precision * recall) / (precision + recall), detail: `${hit} of ${want.size} found, ${got.size - hit} wrong` };
    },
  },
  fields: {
    basis: 'mechanical',
    check: (g, w) => needKeyOrCommitment(g, w, 'expected', isFlatObject, 'an object of dotted path to value (max 200)'),
    grade(g, ctx) {
      const want = revealed(g, 'expected', ctx, isFlatObject, 'an object of dotted path to value');
      const paths = Object.keys(want);
      const ans = ctx.answer && typeof ctx.answer === 'object' ? ctx.answer : {};
      const hit = paths.filter((p) => sameValue(pathGet(ans, p), want[p], g.case_sensitive === true)).length;
      return { score: hit / paths.length, detail: `${hit} of ${paths.length} fields correct` };
    },
  },
  contains_all: {
    basis: 'mechanical',
    check: (g, w) => needKeyOrCommitment(g, w, 'required', (v) => isStringList(v) && v.length <= 100, 'a list of 1 to 100 strings'),
    grade(g, ctx) {
      const cs = g.case_sensitive === true;
      const need = revealed(g, 'required', ctx, isStringList, 'a list of strings');
      if (typeof ctx.answer !== 'string') return { score: 0, detail: 'answer is not text' };
      const hay = norm(ctx.answer, cs);
      const hit = need.filter((n) => hay.includes(norm(n, cs))).length;
      return { score: hit / need.length, detail: `${hit} of ${need.length} required items present` };
    },
  },
  cases: {
    basis: 'mechanical',
    check: (g, w) => needKeyOrCommitment(g, w, 'cases', isCases, 'a list of {id, expected, tolerance?} with unique ids (max 500)'),
    grade(g, ctx) {
      const cases = revealed(g, 'cases', ctx, isCases, 'a list of {id, expected, tolerance?}');
      const ans = ctx.answer && typeof ctx.answer === 'object' && !Array.isArray(ctx.answer) ? ctx.answer : {};
      let sum = 0;
      let full = 0;
      for (const c of cases) {
        const out = Object.hasOwn(ans, c.id) ? ans[c.id] : undefined;
        let s = 0;
        if (out !== undefined) {
          if (c.tolerance !== undefined) {
            const x = asNumber(out);
            const t = asNumber(c.expected);
            s = x === null || t === null ? 0 : clamp01(1 - Math.abs(x - t) / c.tolerance);
          } else {
            s = sameValue(out, c.expected, g.case_sensitive === true) ? 1 : 0;
          }
        }
        sum += s;
        if (s === 1) full += 1;
      }
      return { score: sum / cases.length, detail: `${full} of ${cases.length} cases fully correct` };
    },
  },
  metric: {
    basis: 'mechanical',
    check(g, w) {
      if (typeof g.source !== 'string' || !g.source) bad(w, 'source names who measures it (for example arena:trace)');
      if (!['higher', 'lower'].includes(g.direction)) bad(w, 'direction must be higher or lower');
      if (!(typeof g.floor === 'number' && typeof g.ceiling === 'number' && g.ceiling > g.floor)) bad(w, 'floor and ceiling must be numbers with ceiling above floor');
    },
    grade(g, ctx) {
      const x = attested(ctx, g.source);
      const up = clamp01((x - g.floor) / (g.ceiling - g.floor));
      return { score: g.direction === 'higher' ? up : 1 - up, detail: `measured ${x} (${g.direction} is better, ${g.floor} to ${g.ceiling})` };
    },
  },
  hunting_party: {
    basis: 'mechanical',
    check(g, w) {
      if (typeof g.party_id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(g.party_id)) bad(w, 'party_id is the hunting party id');
      if (typeof g.metric !== 'string' || !/^[a-z0-9_]{1,40}$/.test(g.metric)) bad(w, 'metric names one numeric field of a participant in the party proof');
      if (g.direction !== undefined && !['higher', 'lower'].includes(g.direction)) bad(w, 'direction must be higher or lower');
      if (!(typeof g.floor === 'number' && typeof g.ceiling === 'number' && g.ceiling > g.floor)) bad(w, 'floor and ceiling must be numbers with ceiling above floor');
    },
    grade(g, ctx) {
      const x = attested(ctx, partySource(g));
      const up = clamp01((x - g.floor) / (g.ceiling - g.floor));
      return { score: (g.direction ?? 'higher') === 'higher' ? up : 1 - up, detail: `${g.metric} ${x} in hunting party ${g.party_id}` };
    },
  },
  external: {
    basis: 'external',
    check(g, w) {
      if (typeof g.source !== 'string' || !g.source) bad(w, 'source names the outside scorer (for example bittensor:sn<id>)');
    },
    grade(g, ctx) {
      const x = attested(ctx, g.source);
      if (x < 0 || x > 1) throw new ArenaError('attestation_range', `trial ${ctx.trialId}: ${g.source} score for ${ctx.entryId} is outside 0..1`);
      return { score: x, detail: `scored ${x} by ${g.source}` };
    },
  },
  judge: {
    basis: 'judged',
    check(g, w) {
      if (typeof g.rubric !== 'string' || g.rubric.trim().length < 20) bad(w, 'rubric must say in words what earns a high score (at least 20 characters)');
    },
    grade(g, ctx) {
      const x = attested(ctx, 'judge');
      if (x < 0 || x > 1) throw new ArenaError('attestation_range', `trial ${ctx.trialId}: the judge's score for ${ctx.entryId} is outside 0..1`);
      return { score: x, detail: `judged ${x} against the rubric` };
    },
  },
};
