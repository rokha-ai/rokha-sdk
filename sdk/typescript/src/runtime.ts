import type { RokhaClient } from './client.js';
import type { StudioAccess, SubscribeRequest } from './types.js';

// The Runtime surface — "run for real". This is the product thesis: a skill is
// inert without a runtime, and these two doors are how a skill actually
// executes in the platform's isolated (egress-only, no-secrets) Fargate
// sandbox, writing a trace as the receipt.
//
// - `taste` was the anonymous door. It is closed: an anonymous caller has no
//   runs, and the door answers a refusal (sign in). It is kept for back-compat
//   with callers that still send an `anon_session_id`.
// - `run` is the signed-in door: free to start, pay for scale — 5 runs a day
//   on a free account, then a run pack (100 runs for $1), or the Lab (the
//   month) for 300 a day. Model steps run on your own
//   model key. It requires the client's bearer JWT (set via
//   `RokhaClient.setAuthToken`). Past the free day it throws a `RokhaError`
//   whose `budget` carries the `ladder`.
//
// Both anchor their trace to a Working-Rig harness (`harness_id`, a UUID) —
// a run without an anchor can't persist, and the run IS its own receipt.

export interface TasteRequest {
  /** The caller's anon session id (same UUID the anon chat/rig uses). */
  anon_session_id: string;
  skill_provider: string;
  skill_slug: string;
  instruction?: string;
  params?: Record<string, unknown>;
  /** The Working Rig's harness id (UUID) — anchors the trace. */
  harness_id: string;
}

export interface RunRequest {
  skill_provider: string;
  skill_slug: string;
  instruction?: string;
  params?: Record<string, unknown>;
  /** The Working Rig's harness id (UUID) — anchors the trace. */
  harness_id: string;
  /** Optional model pin for the run. */
  model?: string;
}

/** A run acknowledgement. Field set varies; `run_id` identifies the run so you
 *  can poll progress and read the resulting trace. */
export interface RunAck {
  run_id?: string;
  status?: string;
  [extra: string]: unknown;
}

export class RuntimeClient {
  constructor(private readonly client: RokhaClient) {}

  /**
   * The anonymous taste — CLOSED (an anonymous caller has no runs; answers a
   * 429 `sign_in_required`). Sign in and use `run`.
   */
  taste(req: TasteRequest): Promise<RunAck> {
    return this.client.post<RunAck>('/api/runtime/taste', req);
  }

  /**
   * A signed-in real run against the caller's runs — 5 a day free, then a run
   * pack, or 300 a day with the Lab; model steps on your own model key.
   * Requires the bearer JWT (set via `RokhaClient.setAuthToken`). A 429 is a
   * `RokhaError` whose `budget` names the `code` and the `ladder`.
   */
  run(req: RunRequest): Promise<RunAck> {
    return this.client.post<RunAck>('/api/runtime/run', req);
  }

  /**
   * Poll a run's live progress (public, run-token gated server-side).
   * Returns whatever progress the server exposes for `run_id`.
   */
  progress(runId: string): Promise<unknown> {
    return this.client.get(`/api/runtime/runs/${runId}/progress`);
  }

  /**
   * Start your own Lab month — `POST /api/studio/checkout {product: 'month'}`,
   * the REST twin of MCP `subscribe`. usdc + `payer_wallet` → exact pay
   * instructions; sol / rokha + `payer_wallet` → a 60-second quote; card →
   * a Stripe link for a person. All payments are final.
   */
  subscribe(req: SubscribeRequest): Promise<Record<string, unknown>> {
    return this.client.post('/api/studio/checkout', { product: 'month', ...req });
  }

  /** Your own Lab access — `GET /api/studio/access` (MCP `subscription_status` adds the ladder). */
  subscriptionStatus(): Promise<StudioAccess> {
    return this.client.get('/api/studio/access');
  }
}
