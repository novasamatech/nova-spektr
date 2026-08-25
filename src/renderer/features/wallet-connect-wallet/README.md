# WalletConnect & Nova Wallet

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-25
>
> **Draft — pending author review.** Written from reading the code; needs sign-off from the feature owner before it is
> treated as the source of product truth.

## Overview

Defines how a paired WalletConnect wallet behaves once it exists: where its accounts can act, how the live connection to
the mobile wallet is shown, and how Nova Wallet is presented as its own thing rather than as a generic WalletConnect
peer.

Nova Wallet connects over the same WalletConnect transport but is treated as a distinct wallet type end to end — its own
group in the switcher, its own branding in the account structure — because to the user it is "my Nova Wallet", not "some
WalletConnect app".

## Who can use it / when it applies

Applies to every account created through a WalletConnect pairing, in both flavours (generic WalletConnect and Nova
Wallet). Availability of the pairing itself is handled by `wallet-connect-wallet-pairing`.

## States / scenarios

| Situation                             | Behaviour                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account's chain matches the target    | The account can act and sign on that chain                                                                                                                                                                                                                                                                                        |
| Account is on a different chain       | Not available — a WalletConnect session is negotiated per chain, so an account is bound to its own                                                                                                                                                                                                                                |
| Signing multiple transactions         | Never allowed: each transaction needs its own round trip to the phone, approved one at a time                                                                                                                                                                                                                                     |
| Session is live for the wallet        | The switcher row shows a green dot                                                                                                                                                                                                                                                                                                |
| Session is missing or expired         | The switcher row shows a grey dot — the wallet is still selectable, but signing will need reconnect                                                                                                                                                                                                                               |
| Session lacks the transaction's chain | Signing stops on a reconnect prompt instead of sending a request the wallet would reject: "Reconnect" re-pairs the wallet with the full chain list (a QR when the phone has to scan again), shows "Connected", then signs. A fresh session that still lacks the chain means the wallet app does not support it — reported as such |
| Account structure view                | Nova Wallet accounts are drawn in Nova blue; other WalletConnect accounts in WalletConnect blue                                                                                                                                                                                                                                   |

The switcher shows two separate groups — "Nova Wallet" and "WalletConnect" — each searchable by wallet name or any of
its addresses, each row showing the connection dot and the wallet's live fiat balance.

**Which address represents the wallet.** A WalletConnect wallet usually holds several chain accounts. Both the switcher
icon and the row identicon key off the wallet's Polkadot account when it has one, falling back to the first account
otherwise, so the same wallet always looks the same wherever it is shown.

## Lifecycle

1. `wallet-connect-wallet-pairing` negotiates a session and creates the wallet.
2. The wallet appears in its group with a live connection indicator that follows the session state.
3. If the session drops, the wallet stays in the list — the user can still browse its balances — and reconnecting is
   offered from the wallet's own actions rather than by re-adding the wallet.
4. A session paired before a network existed in the app (or approved for fewer chains) is caught at signing time — the
   sign client rejects requests for chains outside the session, so the flow re-pairs first rather than surfacing the raw
   "Missing or invalid. request() chainId" error.

## Related

- `wallet-connect-wallet-pairing` — pairing and reconnect flow.
- `sign-wallet-connect` — the signing path that carries a transaction to the phone and back.
