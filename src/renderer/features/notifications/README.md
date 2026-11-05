# Notifications

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-11-05

## Overview

The Notifications page lists what happened to the user's multisig and proxy accounts: a multisig created with one of the
user's accounts as a signatory, a flexible multisig created or edited, a proxy added or removed, a multisig operation
started, approved, executed or cancelled, and draft changes. The list can be searched and filtered by date. A settings
modal chooses which wallets and which events produce notifications, and whether they play a sound.

The notifications themselves are stored and produced by `entities/notification`; this feature presents them and edits
the settings.

## States / scenarios

| State              | When it appears                                                           | What the user sees                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| No notifications   | Nothing has been recorded yet                                             | `EmptyNotifications` placeholder                                                                                                       |
| List               | At least one notification passes the search and the date range            | Groups by day, newest first; each group is a collapsible section                                                                       |
| Nothing found      | A search query or date range is active and hides every notification       | "Nothing found" illustration with a hint to change the filters                                                                         |
| Row can't be drawn | Rendering one notification throws (e.g. call data of an unexpected shape) | That row reads "This notification can't be displayed"; the rest of the list works; the failure is logged once with the notification id |

### Rows

Each notification type has its own row (`NotificationsList/ui/notifies/`): multisig invite, flexible multisig
created/edited, multisig operation, multisig event (approval, execution, cancellation), proxy created, proxy removed,
and a plain title row for draft changes. Every row shows its time on the right. Operation rows show the call's title and
amount resolved from the operation's call data, using the same helpers as the Operations page.

### Search and date range

- The query is debounced by 300 ms and matched with `performSearch` against the title, description, chain name, the
  issuer's wallet name and address (with the chain's prefix), the multisig or account name, the proxy type, the status
  and a readable type label.
- The date range keeps notifications whose day falls inside it; an open-ended range (only a start) keeps everything from
  that day on.

### Settings

- Sound on/off, the multisig wallets to notify about, and the event types to notify about.
- Changes are saved when the modal closes; a toast confirms it with an Undo action that restores the settings as they
  were when the modal opened.

## Related

- `entities/notification` — storage of notifications and settings, creation of notifications from chain events.
- [`multisig-operations`](../multisig-operations/README.md) — the Operations page uses the same call-title and amount
  helpers and isolates each row the same way.
- `notifications-navigation` — the sidebar entry and unread counter.
