# Hidden Wallets

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-08-20
>
> **Draft — pending author review.** Written from reading the code; needs sign-off from the feature owner before it is
> treated as the source of product truth.

## Overview

A settings screen listing the wallets the user has **manually** hidden, so they can be brought back. Hiding never
deletes a wallet — it only takes it out of the switcher — and this is the one place that shows what has been put away
and lets the user undo it.

## Who can use it / when it applies

Reached from Settings → General actions. It lists only wallets hidden by the user's own explicit action. Wallets the app
hid on its own — the bulk "hide unnamed wallets" clean-up (see `hide-unnamed-wallets`) — are a different kind of hidden
and are not offered here; that action has its own undo.

## States / scenarios

| State                  | When it appears                           | What the user sees                                      |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------- |
| Nothing hidden         | No manually hidden wallets                | Empty state explaining that hidden wallets show up here |
| Search matched nothing | A query is typed and no wallet matches it | "Nothing was found" with a hint to change the search    |
| List                   | At least one wallet is hidden             | Wallets grouped by type, each with a checkbox           |
| Some selected          | 1..n−1 wallets ticked                     | Group and "All wallets" checkboxes go half-checked      |
| All selected           | Every wallet ticked                       | Both checkboxes fully checked                           |
| Restoring              | Restore in progress                       | The action is busy until the wallets are back           |

Selection works at three levels — one wallet, a whole type group, or all wallets — and the group/all checkboxes reflect
the state of what is under them. Search matches the wallet name as displayed and any of the wallet's addresses, and is
debounced so typing stays responsive on large lists.

Each row shows the wallet's fiat balance. Balances for hidden wallets are not kept live by the app, so this screen loads
them on open specifically for this list.

## Lifecycle

1. The user hides a wallet from the wallet switcher; it disappears from the switcher but stays in storage, marked as
   manually hidden.
2. Later they open Settings → Hidden wallets and find it here.
3. They tick one, several, or all wallets and restore them.
4. Restored wallets lose the hidden mark and reappear in the switcher; the selection is cleared only after the restore
   actually completes, so a slow restore cannot leave a half-applied selection behind.

## Related

- `hide-unnamed-wallets` — the bulk clean-up that hides auto-named wallets; those are hidden for a different reason and
  do not appear in this list.
- `wallet-select` — where hiding starts and where restored wallets come back.
