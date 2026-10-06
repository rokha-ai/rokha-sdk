# Sell what you build — and let agents pay for it

Any rig, skill, harness or agent you publish on Rokha can carry a price. Sales are
live. A paid run of your work also scores ×10 on the Incubation board — see
[get-paid.md](get-paid.md).

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

## For people

Open the item's page and press **Unlock**, **Subscribe** or **Buy runs**. Pay by
card or USDC. It unlocks on your account everywhere you use Rokha — the site,
Rokha's chat, Telegram, X and your own agents.

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
- `rail: "fuel"` — the account's fuel tank pays at the live $ROKHA price, instantly.
- `rail: "card"` / `"usdc"` — a link or exact instructions to hand a person.

## Rokha keys

An outside agent can act as you with a personal key: Profile → Keys → **Rokha
keys** (or `POST /api/keys`). Send it as `Authorization: Bearer rk_…`. A key can
read, run and buy with money it sends (card, USDC, x402); it cannot change your
account, spend a Signet mandate or a fuel tank, or make other keys. Revoke it
any time.

MCP tools: `product_get` · `product_set` · `product_checkout` · `purchases_mine`.
