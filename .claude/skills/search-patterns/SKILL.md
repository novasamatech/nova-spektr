---
name: search-patterns
description:
  Use when adding, changing or reviewing a user-typed search/filter over a list (accounts, wallets, contacts,
  validators, operations, assets) — a search input, combobox or picker filtering rows by query. Also use when a user
  reports search "not finding" an item they can see in the list, or results disappearing while typing a visible name.
---

# Search Patterns

The canonical convention is `docs/content/docs/code/style/search.md` — read it before writing or changing any list
search. Core rule: **the query matches the strings the user actually sees in the row, never raw stored fields.**

## Operational rules

- Engine: `performSearch` from `@/shared/lib/utils` (weighted substring match, `getMeta` for computed display strings).
  Never hand-roll `.toLowerCase().includes()` filters for user-facing search.
- Account lists: use `accountService.searchAccounts` from `@/domains/network`. It matches resolved account name
  (`useAccountsNames`), resolved wallet name (`useWalletsNames`) and the displayed SS58 address. Reference usage:
  `src/renderer/features/multisig-wallet-create/*/components/components/Signatory.tsx`; tests:
  `src/renderer/domains/network/account/service.test.ts` (`searchAccounts` block).
- Rows rendered via `<NamedAccount>` / `useAccountName` / `useWalletName` ⇒ the same resolved names must be in the
  search meta. If the component displays `${walletName} (${accountName})`, both parts must be searchable.
- Do not re-rank lists whose order carries meaning (validators by stake, operations by date) — filter over displayed
  strings but keep the source order.
- Effector-model searches (no React hooks available) must still search displayed strings — resolve names via
  `accountService.resolveAccountName` / domain caches, not raw `wallet.name` / `account.name`.

## Review checklist

When reviewing a diff that touches search:

1. Find what the row renders (which name/address, with what prefix).
2. Find what the query is matched against.
3. Any displayed string missing from the match set, or any matched field that is never displayed — flag it.
