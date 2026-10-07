import { createHash } from 'node:crypto';

export class ArenaError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.code = code;
    if (detail !== undefined) this.detail = detail;
  }
}

export function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new ArenaError('bad_number', 'non-finite number in hashed data');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  throw new ArenaError('bad_value', `cannot hash a ${typeof value}`);
}

export const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
export const hashOf = (value) => sha256(canonical(value));

export function commitment(answer, salt) {
  if (typeof salt !== 'string' || salt.length < 16) {
    throw new ArenaError('weak_salt', 'a commitment salt must be a string of at least 16 characters');
  }
  return hashOf({ answer, salt });
}

export function parseUnits(value, what) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,38})$/.test(value)) {
    throw new ArenaError('bad_amount', `${what} must be a base-unit integer string`);
  }
  return BigInt(value);
}

export function parseTime(value, what) {
  const ms = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(ms)) throw new ArenaError('bad_time', `${what} must be an ISO-8601 timestamp`);
  return ms;
}
