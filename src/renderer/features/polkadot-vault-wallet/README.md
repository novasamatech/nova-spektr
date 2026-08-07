# Polkadot Vault Wallet

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-07
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

| Situation                                             | Behaviour                                                                                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Wallet has exactly one account (legacy Parity Signer) | Wallet-switcher icon is keyed to that single account's address                                                                    |
| Wallet has multiple derived accounts (modern Vault)   | Wallet-switcher icon is keyed to the wallet's root account instead of any one derived key                                         |
| Account is Ethereum-based                             | Icon theme is `ethereum`                                                                                                          |
| Single-account, non-Ethereum                          | Icon theme is `polkadot`                                                                                                          |
| Multi-account, non-Ethereum                           | Icon theme is `jdenticon`                                                                                                         |
| Any Vault account                                     | Can sign, can batch-sign multiple transactions in one scan, and is available on **every** network with a compatible crypto scheme |
| A new key added in the key constructor                | Defaults to **All networks** — no `chainId` is stored; picking a network scopes the key the old way                               |
| An Ethereum (EVM) key                                 | Must be scoped to an EVM network; "All networks" always means Substrate                                                          |
| A shard group                                         | Always scoped to a network — sharding is a per-network construct                                                                  |

Wallets are listed in the wallet-switcher's "Polkadot Vault" group, searchable by wallet name or any of its addresses,
each row showing its live fiat balance.

**Why batch signing is always allowed.** Signing happens by scanning a QR code with the physical device, not through a
per-transaction online approval — so there's no session-based reason to limit a Vault wallet to one transaction at a
time the way an online signer might be.

**Why keys are network-agnostic.** A derived key is a keypair; the same public key is valid on every network — only the
displayed address prefix differs. The network a key was derived under in the key set is recorded (it groups the keys and
names them) but it does not restrict where the key may be used, so a key added under one network can pay fees, stake,
vote and co-sign a multisig on any other. The only hard limit is the crypto scheme: a Substrate key never appears on an
Ethereum-based network, and vice versa.

Binding availability to the derivation network used to break signing in a way that read as "you don't have the key": on
every other network the user's real key was replaced in the account graph by a permission-less signatory placeholder,
which kept the address and the resolved name but carried no signing rights — so the app offered "Add wallet" for a
multisig the user could in fact sign for, and re-adding the same key changed the displayed name without unblocking it.

> Spektr no longer restricts which network a key signs on, but the Polkadot Vault device still holds keys per network.
> If the target network is missing from the key set on the device, the QR scan is rejected there — the user adds the
> network to the key in Vault, not to the wallet in Spektr.

**How an unscoped key reaches the device.** The derivation request carries a genesis hash only to tell Vault which key
set to file the new key under; the public key that comes back depends on the derivation path and the encryption alone.
An unscoped key is therefore requested under Polkadot relay — the network every key set already has — and the signing
payload later carries the genesis hash of whatever network the transaction is for.

Unscoped keys are stored as universal accounts (no `chainId`), grouped under "All networks" ahead of the per-network
groups in the wallet details and the shard selector, and written to the keys file under a `genesis: universal` section.
App versions that predate the marker skip those keys on import rather than filing them under the previous section.

The three default keys created when a key set is paired (`//polkadot`, `//kusama`, `//westend`) stay network-scoped:
changing their derivation paths would change the addresses a user gets for the same seed.

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
