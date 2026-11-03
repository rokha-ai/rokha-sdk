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
