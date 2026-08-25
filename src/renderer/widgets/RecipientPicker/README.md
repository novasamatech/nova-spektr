# Recipient picker

> Part of the [Feature Map](../../features/README.md) — Last reviewed: 2026-08-25

## Overview

The address field an operation shows when it asks _which account_ money or rights should go to: the transfer recipient,
a staking payout account. One combobox, one rule for what it offers, so the user meets the same list — and the same
search — wherever the question is asked.

## Who can use it / when it applies

Any form that takes a destination address on a known chain. The host owns the value and its validation; the picker owns
the search and the suggestions. Pass `excludeAccountId` when one account must never be offered (a transfer's sender).

## States / scenarios

The list is three groups, filtered by name or address as the user types:

| Group         | Contents                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Own accounts  | Accounts of **all** the user's wallets that can _receive_ on the chain, grouped by wallet family: keyed accounts (vault keys, extension, WalletConnect — the user holds the signing key) qualify by address-scheme match even when the key belongs to another chain; everything else (multisig, proxied / pure proxy, watch-only, signatories) follows its wallet feature's availability rule. |
| Address book  | Contacts — local and synced from the external address book — whose address is valid on the chain.                                                                                                                                                                                                                                                                                              |
| Typed address | A pasted/typed address not present above, so fresh addresses work without creating a contact.                                                                                                                                                                                                                                                                                                  |

The receive-vs-sign distinction exists for key-set vaults: their chain-scoped derived keys are valid recipients on any
scheme-compatible chain. The relaxed scheme-match rule applies only to accounts whose key the user holds; for the rest
the picker defers to the owning wallet feature's availability rule — offering such an address on a chain where it is not
controlled would send funds into the void. The rule itself is `accountService.canReceiveOnChain`.

Search runs over what each row shows, never the raw stored fields: own accounts match by their resolved account name,
the resolved name of the owning wallet and the address as displayed with the chain's prefix
(`accountService.searchAccounts`); contacts match by their name and the same chain-prefixed address — not the prefix-42
address the address book stores. A contact renamed in the address book is found by the name on screen, and a pasted
address finds the row that shows it.

## Related

- [`transfer`](../../features/transfer/README.md) — the recipient field, plus the committed-recipient card and the XCM
  "Myself" button it adds around the picker.
- [`staking-payee-flow`](../../features/staking-payee-flow/README.md) — the payout account under "Transferable to
  account".
- `wallet-select` — the wallet-family grouping and its labels.
