# @rokha_ai/arena-engine

The open engine behind the [Rokha Arena](https://docs.rokha.ai/guides/arena.html): a gauntlet spec and its entries in, a reproducible verdict and settlement plan out. Anyone can recompute a published verdict from the public pool and compare its hash.

```sh
# Recompute the verdict of a published gauntlet
npx -y @rokha_ai/arena-engine pool --pool-url https://rokha.ai/api/signet/pledge-pools/<pool_id>

# Seal an answer before pledging (keep the salt)
npx -y @rokha_ai/arena-engine commit --answer answers.json --salt <at-least-16-chars>
```

Trial kinds include mechanical graders, external attestations and `hunting_party`, which scores each entrant from the public proof of a Rokha hunting party (`GET /api/hunting-parties/:id/proof`, matched by the Rokha page handle stamped on each pledge).

No dependencies. Node 20+. Apache-2.0.
