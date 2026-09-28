import type { RokhaClient } from './client.js';

// Rigs + Traces — the Working Rig surface (schema 4.1.0).
// A Rig is a workflow of configured harnesses; a trace is the record of a
// run (input in, result out). The authed surface is owner-scoped via the
// client's bearer JWT. Pre-login, the SAME surface is mirrored under
// /api/anon/... keyed by an `x-anon-session-id` header — get that view via
// `client.rigs.anon(sessionId)`.

export interface TraceRecord {
  id: string;
  harness_id?: string | null;
  rig_id?: string | null;
  run_id?: string | null;
  parent_trace_id?: string | null;
  trace_kind?: string;
  status: string;
  input?: unknown;
  result?: unknown;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  /** `public` when the trace belongs to a run of a published rig (readable by anyone with its id). */
  visibility?: 'public' | 'private';
}

/** Optional filters for `listTraces` — each narrows the caller's own traces. */
export interface TraceFilters {
  run_id?: string;
  parent_trace_id?: string;
  harness_id?: string;
  rig_id?: string;
  status?: string;
  trace_kind?: string;
  node_id?: string;
}

export class RigsClient {
  constructor(
    private client: RokhaClient,
    private prefix = '/api',
    private extraHeaders: Record<string, string> = {},
  ) {}

  /** The pre-login mirror of this surface, scoped to an anon session id. */
  anon(sessionId: string): RigsClient {
    return new RigsClient(this.client, '/api/anon', { 'x-anon-session-id': sessionId });
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.client.fetch(`${this.prefix}${path}`, {
      method,
      headers: this.extraHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res.json() as Promise<T>;
  }

  // --- Rigs ---

  async list(): Promise<unknown> {
    return this.req('GET', '/rigs');
  }

  async create(rig: { key?: string; summary?: string; content?: Record<string, unknown> }): Promise<unknown> {
    return this.req('POST', '/rigs', rig);
  }

  async get(id: string): Promise<unknown> {
    return this.req('GET', `/rigs/${id}`);
  }

  async update(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.req('PUT', `/rigs/${id}`, body);
  }

  async listHarnesses(rigId: string): Promise<unknown> {
    return this.req('GET', `/rigs/${rigId}/harnesses`);
  }

  async addHarness(
    rigId: string,
    member: { harness_id: string; position?: number; role?: string },
  ): Promise<unknown> {
    return this.req('POST', `/rigs/${rigId}/harnesses`, member);
  }

  // --- Traces ---

  /** Your own traces — the bearer JWT alone (limit 1..200). */
  async listTraces(
    limit = 50,
    offset = 0,
    filters: TraceFilters = {},
  ): Promise<{ data?: TraceRecord[] } & Record<string, unknown>> {
    const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    for (const [k, v] of Object.entries(filters)) {
      if (v) qs.set(k, v);
    }
    return this.req('GET', `/traces?${qs.toString()}`);
  }

  /**
   * One trace. Yours in full; a trace from a run of a PUBLIC rig is readable
   * with no auth at all (the runner's identity stripped); anything else is a
   * 404 `trace_not_found`.
   */
  async getTrace(id: string): Promise<{ success?: boolean; data?: TraceRecord } & Record<string, unknown>> {
    return this.req('GET', `/traces/${encodeURIComponent(id)}`);
  }

  async createTrace(trace: {
    harness_id?: string;
    rig_id?: string;
    trace_kind?: 'atomic' | 'run';
    input?: unknown;
    result?: unknown;
    status?: 'success' | 'error' | 'partial' | 'running';
    metadata?: Record<string, unknown>;
  }): Promise<unknown> {
    return this.req('POST', '/traces', trace);
  }
}
