# Multisig wallet creation

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-17

## Overview

Creates a new multisig wallet from the "Add wallet" menu. Two variants are offered up front:

- **Flexible multisig** — a proxied multisig: the visible address is a pure proxy controlled by the multisig, so
  signatories and threshold can later be changed while the address stays the same. Requires an on-chain deposit
  (returned on deletion) and works only on the network it was created on.
- **Multisig** (regular) — a plain multisig address derived from the signatory set. No deposit, works on all supported
  chains, but changing signatories or the threshold means creating a new multisig.

## Who can use it / when it applies

- The creator must own at least one non-watch-only account available on the selected network — it becomes the **first
  signatory** and pays the creation fee (and, for flexible, the deposits).
- Remaining signatories may be own accounts, contacts, or arbitrary valid addresses on the chain.
- Flexible multisig is only offered on networks that support it (multisig + proxy pallets).

## Signatory rules

- The first row of the signatory form is always the creator's own account ("My account"): it cannot be deleted and only
  own accounts can be picked into it.
- **Key-set wallets** (e.g. a Polkadot Vault holding several derived keys on one chain): the picker offers each key
  separately, labelled "Wallet name (key name)". The key the user picks is the exact account used everywhere
  downstream — fee/deposit validation, the signing payload, and error messages. The app never silently substitutes
  another key of the same wallet.
- Duplicate addresses, empty addresses/names, and addresses invalid for the chain block submission.
- Named signatories that are not own accounts are saved to the address book after signing.

## States / scenarios

| State | When it appears | What the user sees |
| ----- | --------------- | ------------------ |
| Insufficient funds (key-set wallet) | The selected key cannot cover fee + deposits and its wallet holds more than one distinct key | "Account &lt;key&gt; of wallet &lt;wallet&gt; has insufficient funds… top up the balance of this account by N" — the named key follows the current selection |
| Insufficient funds (single-key wallet) | Same, but the wallet has one account | "Wallet &lt;wallet&gt; has insufficient funds… top up the balance of this wallet by N" |
| Continue disabled | Any validation error, empty/duplicate/invalid signatories, or no threshold selected | Primary action stays inactive |
| Hidden multisig conflict | The same multisig already exists as a hidden wallet | Prompt to restore the existing wallet instead of creating a duplicate |

For flexible multisig the validated cost is: transaction fees (create pure proxy + final multisig call), the pure-proxy
deposit, the proxy re-assignment deposit, and the existential-deposit top-up of the new pure proxy.

## Lifecycle

1. Add wallet → Multisig → choose variant.
2. Flexible: name + network, then signatories + threshold. Regular: signatories + threshold, then name + chain.
3. Continuous validation against the selected first-signatory key; errors shown inline (see States).
4. Confirm → sign with the selected key (QR for vault, extension/WalletConnect otherwise) → submit.
5. On success the wallet appears in the wallet list and is selected; named external signatories are stored as contacts.

## Related

- [`flexible-change-signatories`](../flexible-change-signatories/) — post-creation signatory/threshold editing for
  flexible multisigs.
- `multisig-operations` — approving/rejecting operations of the created multisig.
- Balance subscriptions for candidate signatory wallets power the funds validation.
