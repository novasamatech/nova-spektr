---
title: Search
sidebar:
  order: 3
---

## Search what the user sees

Any user-typed query must match the strings actually rendered in the list item — never internal fields the user cannot
see. If a row shows a resolved account name (via `useAccountsNames` / `useAccountName` / `<NamedAccount>`), a resolved
wallet name (via `useWalletsNames` / `useWalletName`) or an SS58 address with the chain's prefix, the search must run
over exactly those strings.

Matching raw stored fields (`account.name`, `wallet.name`, hex `accountId`) against a query typed from what's on screen
is a bug: raw and resolved names diverge (custom account names, contacts, identities), so results disappear as the user
keeps typing the name they see.

```tsx
// ❌ Raw name is searched, resolved name is displayed
const filtered = performSearch({
  records: accounts,
  query,
  weights: { name: 1, accountId: 0.5 },
});

// ✅ Search over displayed strings
const resolvedAccounts = useAccountsNames(accounts, chain);
const resolvedWallets = useWalletsNames(wallets);

const filtered = accountService.searchAccounts({
  accounts,
  query,
  resolvedAccounts,
  resolvedWallets,
  addressPrefix: chain.addressPrefix,
});
```

## One engine: `performSearch`

Use `performSearch` from `@/shared/lib/utils` for every user-facing list search — don't hand-roll
`.toLowerCase().includes()` filters. When the displayed strings aren't fields of the record, supply them through
`getMeta`:

```ts
performSearch({
  records: members,
  query,
  getMeta: (member) => ({ identityName: identities[member.accountId]?.name ?? '' }),
  weights: { identityName: 1, address: 0.5 },
});
```

For account lists specifically, use `accountService.searchAccounts` from `@/domains/network` — it already matches the
resolved account name, resolved wallet name and displayed address with the right weights.

## Don't re-rank meaningfully ordered lists

`performSearch` sorts results by match weight. That's right for pickers and comboboxes, wrong for lists whose order
carries meaning (validators by stake, operations by date, delegates by activity). There, filter without re-sorting: keep
the original order and drop non-matching rows (`performSearch` result can be re-ordered back by the source list, or use
a plain predicate over the same displayed strings).
