# Proxy verification

## Overview

Lets a user prove that a newly added proxy (delegate) actually has working authority over a pure-proxied wallet. The
flow submits a harmless on-chain ping — `proxy.proxy(real = pure, call = system.remarkWithEvent(<payload>))` —
dispatched by the delegate. When the ping executes, the proxy row in wallet details flips from **Not verified** to
**Verified**; while the multisig approval is collecting signatures the row shows **Pending verification**.

## Who can use it / when it applies

- The proxy row belongs to a pure-proxied (or flexible multisig) wallet, and the delegate is a multisig the user
  participates in.
- Only `Any` and `NonTransfer` proxy types are verifiable (other types cannot dispatch `system.remarkWithEvent`).
  Delayed proxies are not supported.
- Rows that fail these guards show an explanation instead of the Verify button and are marked Verified the first time
  the proxy is used for a real operation.

## The remark

The on-chain remark is a JSON service payload that lets the app match the executed operation back to the exact
(delegate, pure proxy) row:

```json
{
  "kind": "verify-proxy",
  "delegateAccountId": "0x…",
  "pureProxyAccountId": "0x…",
  "remark": "<user text, optional>"
}
```

- The form's **Remark** field sets the `remark` key of this payload (it is not the full remark string — the service
  fields are required for matching).
- An info button next to the field shows the exact payload that will go on chain, so the user can inspect it before
  signing.
- Older pings used `memo` as the key for the user text; the parser still accepts it for in-flight operations.

## States / scenarios

| State                | When it appears                                                              | What the user sees                              |
| -------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| Not verified         | Proxy exists on chain, no executed op via the pair yet                       | Verify button on the proxy row                  |
| Pending verification | A verify ping (matched by the marker payload) is awaiting multisig approvals | "Pending verification" status, no Verify button |
| Verified             | Any multisig op via the (delegate, pure) pair has executed                   | "Verified" status                               |
| Not verifiable       | Proxy type restricted / delayed / chain unsupported                          | Explanation text instead of the button          |

## Lifecycle

1. User clicks **Verify proxy** on a row in wallet details → modal opens with the signing path, an optional **Remark**
   field, and fee/deposit info.
2. **Continue** → confirmation screen with proxy details, the remark, fees, and the sign button (content scrolls if it
   exceeds the modal height).
3. Signing (e.g. Polkadot Vault QR) → submission → the multisig operation is created; the row flips to Pending
   verification.
4. Once the final approval executes the ping, the row becomes Verified. The operation also appears in the multisig
   operations list as a "Verification" card showing the remark text.

## Related

- Consumers of the marker payload: proxy rows in wallet details, the signing-path graph, and the multisig operations
  list.
- The executed-side check is deliberately lenient: any executed multisig op via the (delegate, pure) pair proves
  authority, marker or not. The strict marker check applies only to pending ops, so incidental pending operations don't
  hide the Verify button.
