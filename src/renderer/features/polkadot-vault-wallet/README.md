# Polkadot Vault Wallet

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-20
>
> **Draft — pending author review.** Written from reading the code; needs sign-off from the feature owner before it is
> treated as the source of product truth.

## Overview

Defines how an already-paired Polkadot Vault (or legacy Parity Signer) wallet behaves and appears in the rest of the
app: which accounts can sign, where they're available, how the wallet is drawn in the wallet switcher, and the shared
draft-building logic reused whenever more keys are added to an existing wallet later.

## Who can use it / when it applies

Applies to any account whose signing type is Polkadot Vault (a QR-based, offline signer — the device never connects
online, so every transaction is scanned and returned as a signed QR code). Gated by the same `polkadotVault` feature
flag as the pairing flow.

## States / scenarios

| Situation                                             | Behaviour                                                                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Wallet has exactly one account (legacy Parity Signer) | Wallet-switcher icon is keyed to that single account's address                                                               |
| Wallet has multiple derived accounts (modern Vault)   | Wallet-switcher icon is keyed to the wallet's root account instead of any one derived key                                    |
| Account is Ethereum-based                             | Icon theme is `ethereum`                                                                                                     |
| Single-account, non-Ethereum                          | Icon theme is `polkadot`                                                                                                     |
| Multi-account, non-Ethereum                           | Icon theme is `jdenticon`                                                                                                    |
| Any Vault account                                     | Can sign, can batch-sign multiple transactions in one scan, and is available on any chain matching its own or a parent chain |

Wallets are listed in the wallet-switcher's "Polkadot Vault" group, searchable by wallet name or any of its addresses,
each row showing its live fiat balance.

**Why batch signing is always allowed.** Signing happens by scanning a QR code with the physical device, not through a
per-transaction online approval — so there's no session-based reason to limit a Vault wallet to one transaction at a
time the way an online signer might be.

## Lifecycle

A wallet enters this feature's scope the moment
[`polkadot-vault-wallet-pairing`](../polkadot-vault-wallet-pairing/README.md) creates it. From then on:

1. It appears in the wallet switcher, grouped with other Polkadot Vault wallets.
2. Its accounts become eligible to sign and to appear in balance/chain views per the availability rules above.
3. If the user later adds more derived keys from the wallet's own details screen, that flow reuses this feature's
   draft-building service (`populateDraftAccounts`) to shape the new key drafts the same way the pairing flow does —
   same defaults, same derivation-path-based naming — before handing them to account creation.

## Related

- [`polkadot-vault-wallet-pairing`](../polkadot-vault-wallet-pairing/README.md) — the onboarding flow that creates the
  wallet in the first place.
- `wallet-details` — the existing-wallet settings screen that calls back into this feature's draft-building service when
  adding keys after initial creation.
