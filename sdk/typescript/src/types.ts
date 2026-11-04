export interface RokhaConfig {
  baseUrl: string;
  walletAddress?: string;
  walletChain?: string;
  timeout?: number;
}

export interface HealthResponse {
  status: string;
  version?: string;
  uptime?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  message: string;
  wallet_address?: string;
  context?: Record<string, unknown>;
}

export interface ChatResponse {
  response: string;
  agent: string;
  conversation_id?: string;
}

export interface AgentStatus {
  name: string;
  status: string;
  model?: string;
  personality?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider?: string;
  context_length?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  agent?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskCreateRequest {
  title: string;
  description?: string;
  agent?: string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export interface Harness {
  id: string;
  wallet_address: string;
  harness_type: HarnessType;
  content: Record<string, unknown>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type HarnessType = 'persona' | 'preference' | 'strategy' | 'knowledge' | 'compliance';

export interface HarnessCreateRequest {
  wallet_address: string;
  harness_type: HarnessType;
  content: Record<string, unknown>;
  tags?: string[];
}

export interface HarnessUpdateRequest {
  content?: Record<string, unknown>;
  tags?: string[];
}

export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
  };
}

export interface MCPJsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: Record<string, unknown>;
}

export interface MCPJsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface MarketplaceListing {
  id: string;
  name: string;
  description: string;
  listing_type: 'tool' | 'rig' | 'agent' | 'workflow' | 'skill' | 'server';
  creator_wallet: string;
  status: 'pending' | 'approved' | 'rejected' | 'featured';
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MarketplaceSearchRequest {
  query?: string;
  listing_type?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface WalletChallengeRequest {
  wallet_address: string;
  wallet_type?: 'phantom' | 'metamask' | string;
  chain?: 'solana' | 'ethereum' | string;
}

export interface WalletChallenge {
  challenge_id: string;
  /** Sign this text with the wallet key (Ed25519 on Solana, EIP-191 on EVM). */
  message: string;
  wallet_address: string;
}

export interface WalletVerifyRequest {
  wallet_address: string;
  challenge_id: string;
  signature: string;
}

/** The session a verified signature opens: a Bearer JWT, good for 24 hours. */
export interface WalletSession {
  session_token: string;
  [extra: string]: unknown;
}

export interface User {
  id: string;
  wallet_address: string;
  username?: string;
  created_at: string;
}

export interface LLMCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
}

export interface LLMCompletionResponse {
  id: string;
  choices: Array<{
    message: ChatMessage;
    finish_reason: string;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DiscoveryResult {
  tools: MCPToolInfo[];
  agents: AgentStatus[];
  protocols: Array<{ name: string; url: string }>;
}

/** The House run pack — pay per run after the free day (live values). */
export interface RunPack {
  /** Buy with `POST /api/products/{product_id}/checkout` (MCP `product_checkout`). */
  product_id: string | null;
  runs: number;
  price_cents: number;
  price?: string;
  per_run?: string;
  buy?: string;
  rails: Array<'x402' | 'usdc' | 'sol' | 'rokha' | 'signet' | 'card'>;
  spent?: string;
  no_refunds: true;
}

/** The three rungs as data: free (signed in), a run pack, the Lab. */
export interface RunLadder {
  free: { runs_per_day: number; who?: string; models?: string; resets?: string };
  run_pack: RunPack;
  lab: { month_usd: number; hold_rokha: number; start: string; gives?: string; no_refunds: true };
}

export type BudgetRefusalCode =
  | 'sign_in_required'
  | 'free_runs_spent'
  | 'free_runs_ceiling'
  | 'budget_unavailable'
  | 'runtime_ceiling'
  | 'house_budget_spent';

/** The 429 a run door answers. `ladder` rides `free_runs_spent` and `free_runs_ceiling`. */
export interface BudgetRefusal {
  ok?: false;
  /** `quota` on `POST /api/runtime/run`, `budget` elsewhere. */
  error: 'budget' | 'quota' | string;
  code: BudgetRefusalCode | string;
  message: string;
  upgrade?: string;
  relay?: Record<string, unknown>;
  ladder?: RunLadder;
}

export interface SubscribeRequest {
  /** usdc, sol or rokha for an agent (needs `payer_wallet`); card returns a Stripe link for a person. */
  rail: 'usdc' | 'sol' | 'rokha' | 'card';
  /** The Solana wallet the payment is sent FROM (usdc, sol, rokha). */
  payer_wallet?: string;
  ref_code?: string;
}

/** `GET /api/studio/access` — your own Lab entitlement. */
export interface StudioAccess {
  /** true = full access. */
  studio: boolean;
  access: 'licensed' | 'rent' | 'trialing' | 'free_window' | 'holder' | 'house' | 'none' | string;
  current_period_end?: string;
  tokens?: number;
  [extra: string]: unknown;
}
