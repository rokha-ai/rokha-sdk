import type { RokhaClient } from './client.js';
import type {
  WalletChallenge,
  WalletChallengeRequest,
  WalletVerifyRequest,
  WalletSession,
  User,
} from './types.js';

export class WalletsClient {
  constructor(private client: RokhaClient) {}

  async supported(): Promise<unknown[]> {
    return this.client.get('/api/wallets');
  }

  async detect(): Promise<unknown> {
    return this.client.post('/api/wallets/detect');
  }

  /** Step 1 of the headless sign-in: a one-use challenge to sign. */
  async challenge(request: WalletChallengeRequest): Promise<WalletChallenge> {
    return this.client.post('/api/wallets/challenge', request);
  }

  /** Step 2: the signature for a session — pass `session_token` to `setAuthToken`. */
  async verify(request: WalletVerifyRequest): Promise<WalletSession> {
    return this.client.post('/api/wallets/verify', request);
  }

  async status(): Promise<unknown> {
    return this.client.get('/api/wallets/status');
  }

  async validateSession(): Promise<{ valid: boolean }> {
    return this.client.post('/api/wallets/sessions/validate');
  }

  // --- Users ---

  async register(walletAddress: string): Promise<User> {
    return this.client.post('/api/users/register', { wallet_address: walletAddress });
  }

  async lookup(walletAddress: string): Promise<User> {
    return this.client.post('/api/users/lookup', { wallet_address: walletAddress });
  }

  async getUser(userId: string): Promise<User> {
    return this.client.get(`/api/users/${userId}`);
  }
}
