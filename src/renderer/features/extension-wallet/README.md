# Browser Extension Wallets

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-20
>
> **Draft — pending author review.** Written from reading the code; needs sign-off from the feature owner before it is
> treated as the source of product truth.

## Overview

Covers the three supported browser-extension wallets — Polkadot.js, Talisman and SubWallet — from onboarding through to
how their accounts behave in the rest of the app. All three share one implementation and differ only in branding and in
which extension the account came from.

Extension wallets are marked **BETA** in the UI.

## Who can use it / when it applies

Only extensions actually installed in the browser can be paired: on start-up the feature asks the browser which
supported extensions are present and offers only those. Onboarding cards and the "add wallet" dropdown entries for a
missing extension are shown as unavailable rather than hidden, so the user can see the option exists.

Nova Wallet's own extension is deliberately excluded from this list — it is handled as a WalletConnect wallet, see
[`wallet-connect-wallet`](../wallet-connect-wallet/README.md).

## States / scenarios

| Situation                       | Behaviour                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Extension installed             | Offered for pairing from onboarding and from the "add wallet" dropdown                          |
| Extension not installed         | Entry shown but disabled                                                                        |
| Account is chain-specific       | Available only on its own chain                                                                 |
| Account is not bound to a chain | Available on every supported chain                                                              |
| Any extension account           | Can act and sign, but **never** more than one transaction at a time — the extension prompts per |
|                                 | transaction, so there is no way to approve a batch in one go                                    |
| Account structure view          | Drawn with the source extension's identity: Polkadot.js orange, Talisman lime, SubWallet blue   |

The wallet switcher shows one group per extension — "Polkadot js extension", "Talisman", "SubWallet extension" — each
carrying a BETA label, searchable by wallet name or any of the wallet's addresses, each row showing its live fiat
balance.

## Lifecycle

1. The user picks an installed extension from onboarding or from the "add wallet" dropdown.
2. The pairing modal asks the extension for its accounts and the user chooses which to import.
3. Imported accounts become a wallet of the matching type, listed in that extension's group in the switcher.
4. Signing always goes back out to the extension, one transaction at a time.

## Related

- `wallet-pairing` — the "add wallet" dropdown this feature injects into.
- [`wallet-connect-wallet`](../wallet-connect-wallet/README.md) — where Nova Wallet is handled instead.
