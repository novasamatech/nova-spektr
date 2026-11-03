# Contacts

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-09-29

## Overview

The Contacts feature powers the address book page: creating, editing and importing the user's own contacts, filtering
the list, and connecting to an external (backend) address book whose contacts are shown alongside local ones.

## States / scenarios

| Scenario           | Rule                                                                                                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create / edit      | Name and address are required; the address must be valid and not already saved; the name must be unique (case-insensitive). While editing, keeping the contact's current name is allowed.                                                                      |
| Import from file   | Each entry needs a name (up to 256 characters) and a valid address. Duplicates inside the file are resolved one group at a time; entries clashing with existing contacts ask to replace or keep the current one.                                               |
| Source tabs        | "My contacts" is always available. "External source" appears when an address book backend is configured and signed in. If the user has no local contacts, the external tab opens by default. Signing out or clearing the backend URL returns to "My contacts". |
| Backend connection | A connection card and sync badge show the backend status; when the session expires or the backend is unreachable, a health overlay offers to reconnect.                                                                                                        |

## Name normalisation

Contact names are normalised before they are saved, compared or imported: invisible formatting characters are removed,
control and line/paragraph separator characters are replaced with spaces, surrounding whitespace is trimmed, and the
text is normalised to a single Unicode form. A name that is empty after normalisation is rejected. Uniqueness checks
compare normalised names, so two names that look the same are treated as the same name.

## Related

- [`recipient-verification`](../../aggregates/recipient-verification/README.md) — unknown-recipient warnings based on
  the address book.
- [`send-to-contact`](../send-to-contact) — transfer flow launched from the contacts page.
