# Operations Search

> Part of the [Feature Map](../../features/README.md) — Last reviewed: 2026-08-21

## Overview

The Operations view has one search box above a list that mixes two kinds of rows: **pending drafts** and **multisig
operations**. This aggregate is the single matcher behind that box, so one query behaves the same way on both — with one
documented exception below.

The rule it exists to enforce: **a query matches the strings the row actually shows**. Names in the list are resolved —
a custom name, an address-book contact or an on-chain identity is displayed instead of the raw stored name — so the
search resolves them the same way before matching. Typing a name you can see always finds its row.

## What a query matches

| The user types          | Matches against                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| A submitter's name      | The resolved name shown in the Submitter column, and the wallet name displayed over it                                                             |
| **An initiator's name** | The one name the Initiator column shows: the account's own resolved name, or — when it has none — the name of the wallet it belongs to (see below) |
| An address              | Any account the row shows, formatted with the prefix that row displays it with                                                                     |
| A note                  | A draft's description                                                                                                                              |
| A call hash             | An operation's call hash                                                                                                                           |

A row's searchable accounts are every account it puts on screen, not only the one in the collapsed row: for a draft that
is **every hop of its signing path** (which is exactly what the details panel lists — so a nested multisig's root hop is
searchable even though no flat field stores it); for an operation, the submitter and the initiator.

**Known gap — an operation's description is displayed but not searchable.** Descriptions come from the address book and
are fetched only for operations that already passed the filter, so feeding them into the filter would be circular
(search narrows the list → fewer descriptions fetched → search can't match them). Drafts carry their description inline
and do search it. Closing this means fetching descriptions for the unfiltered list first.

Names rank above descriptions, which rank above addresses and call hashes — a user typing a few letters usually means a
name, while addresses and hashes are pasted whole. Ranking only decides _whether_ a row matches: both lists keep their
own order (operations by the active sort, drafts newest first), because reordering them by match strength would destroy
the meaning of that order.

### Searching the initiator

The **initiator** here is the account that **signs** the outermost multisig call — the signing path's last node, the one
the UI labels "Initiator" and the person a co-signer is waiting on. (The drafts feature also calls the path's _first_
node the initiator in its submit flow; that is a different account. See the drafts spec.) Users could previously only
discover it by opening a draft's Submit dialog, which made "which drafts are waiting on Adam?" an unanswerable question.
Searching a name now answers it.

The two row types store it differently, and it is worth knowing they are not the same kind of fact:

- **A draft** carries the initiator its author _assigned_ when drawing the signing path — a plan. Drafts created before
  the field existed fall back to the signing path's final signer; a draft with neither simply never matches an initiator
  query.
- **An operation** carries the depositor — the account that actually signed and reserved the deposit — a fact.

A draft's assigned initiator is never rewritten, so if a co-signer swaps the signatory at submit time, the draft keeps
naming the originally assigned account. The two values are matched by the same query but must not be treated as
interchangeable anywhere else (permission checks read the depositor directly).

Unlike the submitter, the Initiator column (and the expanded Depositor row) never lets the wallet name _override_ the
account's own name. It resolves custom name → contact → identity → **owning wallet's name** → stored account name →
short address, so an address-book entry for that exact key always wins, and the keyset name only stands in where the
stored name would be a Vault derivation path or a short address. This holds for both row types.

Search mirrors that exactly: the initiator entry contributes the **one** name the column displays — the wallet name is
passed to the resolver as a fallback rather than added as a second searchable string. So a key with a contact is found
by its contact name and _not_ by its keyset name (the keyset name is nowhere on screen for that row), while a key
without one is found by its keyset name. The submitter is unchanged: it displays the wallet name outright, so both it
and the resolved account name stay searchable.

### Addresses are matched as displayed

The same account renders as a different address on different chains. A query is matched against the address the row
shows:

- the **submitter** of an operation is chain-bound only for a flexible multisig; a universal multisig renders with the
  default prefix;
- the **initiator** is matched with the prefix the expanded details render it with — the operation's own chain, on both
  row types.

This is the part that previously failed for flexible multisigs: the search matched the underlying multisig account while
the row displayed the proxied one, so pasting the visible address returned nothing.

## Related

- [`multisig-operations`](../../features/multisig-operations/README.md) — owns the search input and the operations list.
- [`drafts`](../../features/drafts/README.md) — owns the drafts section, filtered by the same query.
- `docs/content/docs/code/style/search.md` — the "search what the user sees" convention this aggregate implements.
- An active **type** or **proxy type** filter puts every draft out of scope, so a search combined with those filters
  returns operations only.
