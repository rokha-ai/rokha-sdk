# Sell what you build — and let agents pay for it

Any rig, skill, harness or agent you publish on Rokha can carry a price. Sales are
live, and selling is one of the two ways money reaches a builder on Rokha (with the
affiliate program). Buyers pay by card, USDC, SOL or $ROKHA; you keep 80%. Rokha pays no
one for use — see [how-it-works.md](how-it-works.md).

## For creators

Set a price on something you own — in the Studio ("Sell it"), on its page, or
over the API:

```bash
curl -X PUT https://rokha.ai/api/products \
  -H "Authorization: Bearer $ROKHA_TOKEN" -H 'content-type: application/json' \
  -d '{"kind":"rig","ref":"<listing id>","model":"one_time","price_cents":1500}'
```

| Model | What the buyer gets |
|---|---|
| `one_time` | It is theirs to keep — run it and remix it |
| `monthly` | A 30-day pass; a renewal adds 30 days |
| `per_run` | A pack of `runs_per_pack` runs |

You keep **80%** of every sale. USDC and other crypto sales pay you **instantly**;
card sales pay on Fridays. Buyers who have not paid see the listing, its inputs
and its price — never its contents.

### Packs — sell a set in one purchase

A pack is your priced set of rigs, skills, harnesses and agents; one purchase unlocks every
item in it. Make it, fill it with items you own, then price it like anything else:

```bash
curl -X POST https://rokha.ai/api/packs -H "Authorization: Bearer $ROKHA_TOKEN" \
  -H 'content-type: application/json' -d '{"slug":"desk","title":"The desk set"}'
curl -X PUT https://rokha.ai/api/packs/<pack id>/items -H "Authorization: Bearer $ROKHA_TOKEN" \
  -H 'content-type: application/json' -d '{"add":[{"kind":"rig","ref":"<listing id>"}]}'
curl -X PUT https://rokha.ai/api/products -H "Authorization: Bearer $ROKHA_TOKEN" \
  -H 'content-type: application/json' -d '{"kind":"pack","ref":"<pack id>","model":"monthly","price_cents":4900}'
```

MCP: `pack_create`, `pack_items_set`, `product_set {kind: "pack"}`; anyone reads it with
`pack_get` (`GET /api/packs/{id}`). A buyer runs any item in it normally — the run door sees
the pack, and a `per_run` pack spends its runs across its items. A pack with no price grants
nothing.

## For people

Open the item's page and press **Unlock**, **Subscribe** or **Buy runs**. Pay by
card or USDC. It unlocks on your account everywhere you use Rokha — the site,
Rokha's chat and your own agents over MCP.

## For agents — pay and run in one call

A paid rig answers its run door with **402 `purchase_required`**, carrying a
standard **x402** challenge:

```json
{
  "code": "purchase_required",
  "checkout_url": "https://rokha.ai/buy/<id>?kind=rig&ref=<ref>",
  "x402Version": 1,
  "accepts": [{ "scheme": "exact", "network": "solana", "asset": "<USDC mint>",
                "payTo": "<Rokha wallet>", "maxAmountRequired": "15000042" }]
}
```

1. Transfer exactly `maxAmountRequired` USDC base units to `payTo` on Solana.
2. Wait for finality, then retry the **same request** with
   `X-PAYMENT: base64({"x402Version":1,"scheme":"exact","network":"solana","payload":{"signature":"<tx>"}})`.
3. The payment is verified on-chain and the run starts in that same call.

Other ways for an agent to pay (`POST /api/products/<id>/checkout` or MCP
`product_checkout`):

- `rail: "signet"` — the account's own USDC Signet mandate pays. An autonomous
  mandate pays inside its caps at once; a guarded one waits for the owner's tap.
- `rail: "rokha"` + `payer_wallet` — pay with $ROKHA: an order for an exact $ROKHA amount
  (`amount_rokha`, `pay_to`, `expires_at`; the quote holds 60 seconds, up to $250 a payment).
  Send exactly that from `payer_wallet` and it confirms on its own. The creator is paid in USDC
  and Rokha's fee on that payment is burned. (`rail: "fuel"` is retired — a balance pays for
  Rokha's models only.)
- `rail: "card"` / `"usdc"` — a link or exact instructions to hand a person.

## Rokha keys

An outside agent can act as you with a personal key: Profile → Keys → **Rokha
keys** (or `POST /api/keys`). Send it as `Authorization: Bearer rk_…`. A key can
read, run and buy with money it sends (card, USDC, x402); it cannot change your
account, spend a Signet mandate or a balance, or make other keys. Revoke it
any time.

MCP tools: `product_get` · `product_set` · `product_checkout` · `purchases_mine`.
