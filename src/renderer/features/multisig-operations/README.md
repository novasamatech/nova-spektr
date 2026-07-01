# Multisig Operations

> Part of the [Feature Map](../README.md) — Last reviewed: 2026-07-01

## Overview

The **Operations view** is the multisig co-signer's inbox. For the active multisig account it lists every operation the
account is involved in — the ones still collecting approvals, the ones already resolved, and the ones the user chose to
hide — and lets the user act on each without leaving the list.

A multisig operation is created when one signatory initiates a call; it then needs a threshold of approvals before it
executes on-chain. Until that happens the operation is a shared, half-finished thing: any co-signer needs to see what it
is, who has already signed, and whether it is their turn. This view is where that happens — reading an operation,
approving or rejecting it, inspecting its decoded call, supplying missing call data, following its event log, attaching
a shared description, and (when the address book is connected) nudging the signatories who still need to act.

## Who can use it / when it applies

The view applies whenever the active account is a **multisig** or a **flexible multisig** (a multisig that operates
through a proxy). Each row is an operation belonging to a multisig the user co-signs. A multisig comes in two flavours,
and the flavour changes what the user can do:

- **Local multisig** — held in one of the user's wallets; the user owns one or more signatory keys. Full per-operation
  actions are available (subject to the rules below).
- **External (contact-backed) multisig** — a multisig the user only _tracks_ through the address book; discovered from
  chain because its address matches a contact. The user holds **no signatory key**, so it is effectively read-only:
  signing actions are replaced by a prompt to pair the wallet that actually holds a key, and the account-structure
  overview is hidden (there is nothing in the user's account graph to draw).

Per operation, what the user can _do_ depends on their relationship to it:

| Action                                                    | Available when                                                                                                                                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **View** (details, signatories, log, call data, advanced) | Always — to anyone who can see the operation                                                                                                                                                            |
| **Approve**                                               | Pending, the user owns an _actionable_ signatory (a signatory account that hasn't approved yet, is reachable on-chain, and is not watch-only), and — for the final signing — valid call data is present |
| **Add call data**                                         | Pending, the user is the _final_ required signer, but the operation's call data is missing/invalid                                                                                                      |
| **Reject**                                                | Pending, and the user owns the **depositor** account (the original initiator)                                                                                                                           |
| **Notify remaining signers**                              | Pending, and the address-book backend is connected and healthy (the backend then authorizes the specific caller)                                                                                        |
| **Add wallet** (external multisig)                        | Pending external multisig — a pairing prompt instead of sign buttons                                                                                                                                    |
| **Attach / edit description**                             | See [Address book availability](#address-book-availability)                                                                                                                                             |
| **Hide / unhide**, **share link**, **export**             | Always                                                                                                                                                                                                  |

Watch-only accounts can view but never sign. In the **History** tab an external multisig shows no action column at all.

## Operation types

Every operation carries an on-chain **call hash**; its **call data** may or may not be known yet. When the call is
decoded, the view recognises a family of operation types and gives each a tailored title, icon, amount, and details
panel. Unrecognised or still-undecoded calls fall back to a generic presentation.

### Recognised families

| Family                     | Operations                                                                                                                           | Shown as                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Transfer**               | Transfer, Transfer-all, asset & ORML transfers                                                                                       | "Transfer" with the amount and asset (Transfer-all shows no number); "Transfer All" for the all-balance variant |
| **Cross-chain (XCM)**      | teleports, reserve transfers, `xTokens`, `polkadotXcm` variants                                                                      | "Cross-chain transfer" with **two** chain chips (source → destination) and the amount                           |
| **Multi-transfer**         | a batch made entirely of transfers                                                                                                   | "Multi Transfer" with the **summed** amount                                                                     |
| **Vested transfer**        | vested transfer (also inside a batch)                                                                                                | "Vested transfer" with the locked amount                                                                        |
| **Staking**                | Start Staking (bond), Change Validators (nominate), Stake More, Unstake, Restake, Withdraw Unstaked (redeem), Set reward destination | each with its own title/icon and, where relevant, amount                                                        |
| **Governance**             | Vote, Remove vote, Unlock, Delegate, Revoke delegation, Edit Delegation                                                              | each with its own title/icon; vote shows the conviction amount                                                  |
| **Proxy management**       | Add proxy, Create pure proxy, Revoke proxy, Revoke pure proxy                                                                        | "…delegated authority (proxy)" titles; details show delegate/revoke target and access type                      |
| **Edit flexible multisig** | swapping the controller of a flexible multisig                                                                                       | a dedicated card — see below                                                                                    |
| **Verify proxy**           | a marker remark proving control of a proxied wallet                                                                                  | a dedicated card — see below                                                                                    |

**Proxy wrappers** are unwrapped for the title, icon, and amount: a proxied call shows the **inner** operation (not
"proxy"), and for a flexible multisig the view always presents the _core_ transaction that runs through the proxy.
**Batches** are given a recognised title only when the whole batch maps to a known shape — a batch of transfers becomes
**"Multi Transfer"**, a vested-transfer batch becomes **"Vested transfer"**. Other batches (for example a bond+nominate
or an unlock+remove-vote) are **not** relabelled to their inner operation in the list: the row shows the generic call
label (**"Utility: Batch all"**) with the generic icon, even though the displayed **amount** is still taken from the
meaningful inner call.

### Two special shapes

These bypass the normal amount row and get a bespoke card in the list plus a bespoke details panel. Detection is
exclusive — an operation is at most one of them.

- **Edit flexible multisig** — swapping which multisig controls a flexible multisig. The card shows the old and new
  controllers (identicons, old → new) and a coloured tag for the mode:
  - **Atomic swap** — the old controller is removed in the same transaction (both add and remove happen together).
  - **Verified swap** — the new controller is added now; the old one is removed later, after verification. The old
    controller is recovered from a marker embedded in the transaction.

  The details panel lists the old proxy (atomic only) and the new proxy, each with its threshold and signatories, the
  execution mode, and a link into the wallet's proxy details.

- **Verify proxy** — a signer proving they control a proxied (pure proxy) wallet by sending a marker remark through it.
  The card shows a verification badge and a "Verification for wallet" label; the **details** panel names the verifying
  wallet, shows the optional remark, and links to the pure-proxy wallet's details.

### Undecoded and unrecognised operations

When the call data has not been supplied yet, only the call hash is known, so the operation cannot be decoded. It then
shows as **"Unknown Operation"** with a generic icon (tinted by status) and no amount. A call that _is_ decoded but
belongs to none of the families above (a bare batch, a remark, a collective call, …) shows its raw **"Section: Method"**
label — e.g. "Utility: Batch all" — with the same generic icon. In both cases the **Advanced** panel still shows the
call hash, deposit, and on-chain time point.

An undecoded operation is still actionable: if the current user is the final required signer, an **"Add call data"**
action lets them paste the hex call data — validated against the call hash — which both decodes the display and unblocks
the final approval.

## The operation row and its panels

A collapsed row shows the operation's title, network, amount, status, a share-link button, and — for a submitted draft —
a badge. Special shapes (edit-flexible, verify-proxy) render their bespoke card here instead of the amount row.
Expanding a row reveals three panels:

- **Details** — depositor, timestamp, the recognised transaction's specifics, and the shared **operation description**
  (see [Related](#related)). Special shapes render their bespoke details here.
- **Signatories** — the signatory list with per-signatory status, the **Log**, **Notify remaining signers**, and (for
  owned multisigs) **Open overview**. Detailed below.
- **Advanced** — call hash, call data with a formatted JSON view (once known), deposit, the on-chain time point with an
  explorer link, and the **hide / unhide** control. When the outer and core calls differ (proxy/batch wrappers), the
  labels switch to "Core call hash" / "Core call data".

### Signatories and the log

**Signatory list.** The list is split into two groups. **Wallet signatories** (accounts held in the user's wallets,
shown with wallet name and icon) are ordered so the story reads top-to-bottom: a signatory who **rejected** is pinned
first, then those who **approved** in block order, then everyone still **pending**. **Contact signatories** (the rest —
shown as a short, copyable address with any known contact name) follow, in account order. Each signatory carries a
status chip — **Signed**, **Rejected**, or **Unsigned** for a pending signatory (rejection takes precedence over an
earlier approval). For an owned multisig an **Open overview** button opens the account-structure view; it is hidden for
external multisigs, and for a flexible multisig it is trimmed to the proxied account, its backing multisig, and the one
proxy connection this operation uses.

**The Log.** The **Log** button (with a badge counting the operation's events) opens a chronological activity feed of
the operation's on-chain lifecycle, grouped by day (oldest first). It distinguishes three event kinds:

- **Initiated** — the depositor's first approval that created the operation.
- **Signed** — any subsequent approval.
- **Cancelled** — a rejection.

Each entry names the signer (resolved to a wallet or contact name, with wallet or identicon avatar), the time of day,
and — where the chain has explorers — a link to the approving/rejecting extrinsic. There is no separate "executed" log
line: the final approval is just another _Signed_ event; overall progress is shown by the signed-of-threshold status in
the log header. A freshly created operation always has at least the initiation event, so the log is never empty.

## Actions

### Approving

An operation can be **approved** by a user who owns an _actionable_ signatory — a signatory account that has not yet
approved, is available on the operation's chain, and is not watch-only. Two cases:

- **Non-final signing** — the threshold is not yet within reach; approving simply records another approval on-chain.
  Call data is **not** required.
- **Final signing** — this approval reaches the threshold and **executes the underlying call**, which requires valid
  call data. If call data is present, the **Approve** button executes it; if it is missing, an **Add call data** button
  is shown instead (the last signer must supply it so the multisig can run the real call).

Approving runs a short wizard: **choose the signing account and path** (with the multisig deposit shown only on the
first approval, plus the network fee) → **confirm** (a recap including the underlying core transaction on the final
sign) → **sign**. Signing adapts to the account's wallet type — Polkadot Vault (QR scan), browser Extension, or
WalletConnect (watch-only accounts cannot sign and are excluded upstream). The signed extrinsic is then submitted, with
a status modal showing **in progress → success** (auto-closing) **or error** (dispatch or submission failures such as
insufficient balance or a network problem). On the final approval of an add/remove-proxy operation the wallet's accounts
are re-synced; an optional operation description is posted to the address book at this point.

### Adding call data

When the final signer faces a missing/invalid call, the **Add call data** modal accepts pasted hex, validates it live
(must be hex, must hash-match the call hash, must decode), previews the decoded call, and stores it. Once valid call
data exists, the operation decodes throughout the view and the **Approve** button appears for the final signer.

### Rejecting

Only the **depositor** (the original initiator) can **reject** a pending operation. Rejecting is a two-step
confirm-then-sign flow that submits a cancellation; the deposit returns to the depositor and the operation moves to the
**History** tab with status _cancelled_.

### Deep-link edge cases

Opening an operation via a shared link can surface a dedicated modal when the target can't be acted on: **already
signed/executed**, **network not available**, **account not found**, **operation not found**, or a **connection
timeout** (with retry).

## Address book availability

Several capabilities in this view are backed by the shared **address-book backend**. The app tracks the connection as a
single health signal — _connected & healthy_ means the user is signed in, the session hasn't expired, there is no
network issue, and the last contact sync didn't error. Anything else is unhealthy, and once the user has connected at
least once it surfaces reconnect affordances (a status dot, a reconnect pill, a session-expired toast with a Reconnect
action, and a re-sync badge).

### What connection state affects

- **Contact names.** Backend contacts are session-scoped and cleared on any disconnect. While connected, signatories and
  the multisig resolve to human names; when disconnected they fall back to shortened addresses.
- **External multisig discovery.** Contact-backed external multisigs (and their operations) exist in the list only
  because a contact matches them, so losing the backend connection drops backend-contact-derived external multisigs on
  the next refresh; locally stored contacts still seed discovery.
- **Notify remaining signers.** Available purely on _backend connected + operation pending_; it does not depend on
  wallet ownership, so it can appear on a tracked external multisig too. The backend then authorizes the specific
  caller.
- **Operation description.** The description is a short note the initiator attaches, published to the shared address
  book so co-signers see the operation's context.

### Description states

An **existing** description is always shown (preview with a "show full" expansion); only the ability to **edit** it
depends on the state below. The **empty** description area is shown, or not, per this rule (in this view the operation
is always a multisig and never a draft submission):

```mermaid
flowchart TD
    START["Empty description area"] --> H{"Backend connected & healthy?"}
    H -- "yes" --> P{"User has write permission?"}
    P -- "no" --> HIDDEN1["Hidden"]
    P -- "yes" --> B{"Multisig in the address book?"}
    B -- "yes" --> FIELD["Add-description field"]
    B -- "no" --> ERROR["Error — add this multisig to the address book"]
    H -- "no" --> E{"Connected before?"}
    E -- "yes" --> RECONNECT["Reconnect prompt"]
    E -- "no" --> HIDDEN2["Hidden"]

    style FIELD fill:#1b5e20,color:#fff
    style ERROR fill:#b71c1c,color:#fff
    style RECONNECT fill:#e65100,color:#fff
    style HIDDEN1 fill:#37474f,color:#fff
    style HIDDEN2 fill:#37474f,color:#fff
```

| State         | When it appears                                                                        | What the user sees                                                           |
| ------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Field**     | Connected & healthy, write permission, multisig is in the address book                 | An editable note (up to 500 characters)                                      |
| **Error**     | Connected & healthy, write permission, but the multisig is **not** in the address book | An inline error naming the multisig and asking to add it to the address book |
| **Reconnect** | Backend unhealthy, but the user has connected before                                   | A slim **Reconnect** prompt                                                  |
| **Hidden**    | Connected without write permission, or the address book was never used                 | Nothing                                                                      |

### Notify remaining signers

On a **pending** operation, when the address-book backend is connected and healthy, a **Notify signers** button
(tooltip: _Notify signatories to sign the operation via Element_) lets a signatory push an Element (Matrix) reminder to
the signatories whose approval is still outstanding. The button appears purely on _backend connected + operation
pending_ — it does not depend on wallet ownership, so it can show on a tracked external multisig too; the backend then
authorizes the specific caller. The backend owns the rules — it only ever reminds still-pending signers, authorizes the
caller (only the operation's creator or a signatory who has already approved may nudge), and rate-limits repeat nudges.
A signer who cannot be reached (delivery failed, or no Element handle on file) counts as _unreachable_. Feedback is
delivered entirely through toasts:

| Outcome                                                              | Toast                                                                            |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| All targeted signers reminded                                        | Success — _reminded N signer(s)_                                                 |
| Some reminded, some unreachable                                      | Success — _reminded N signer(s); M couldn't be reached_                          |
| Nobody was still pending                                             | Neutral — _no signers are waiting yet_                                           |
| Nobody reached, all pending signers lack an Element handle           | Error — _the pending signers have no Element handle in the address book yet_     |
| Nobody reached for other reasons (delivery failed / room not joined) | Error — _couldn't reach the signers_                                             |
| Backend rejects the caller (not creator/approver)                    | Error — _forbidden_                                                              |
| Operation not yet available for reminders (backend hasn't synced it) | Error — _this operation isn't available for reminders yet_                       |
| Nudged too soon after the last one                                   | Error — _rate-limited_ (includes the time the next nudge is allowed, when known) |

The button hides itself entirely once the operation is no longer pending or when the backend is offline.

## List view

### Tabs

The list is split into three tabs, and an operation belongs to exactly one:

| Tab         | What it holds                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| **Pending** | Operations still collecting approvals; also surfaces saved **drafts** awaiting submission, and carries a count badge |
| **History** | Executed, cancelled, or errored operations                                                                           |
| **Hidden**  | Operations the user manually hid (the tab only appears when something is hidden)                                     |

The view opens on **Pending**; a deep link switches to the tab holding the focused operation; unhiding the last hidden
operation switches back to Pending.

### Navigating and grouping

Operations are grouped by day with a date header, and the list is virtualised for long histories. It can be narrowed by
**search** and four **filters**:

- **Search** — matches the multisig wallet name, the multisig address, or the call hash.
- **Date range** — a from/to (or from-only) interval.
- **Network** — matches the operation's chain or, for XCM, its destination chain.
- **Transaction type** — Transfer, Cross-chain, the staking / governance / proxy types, or Unknown.
- **Proxy type** — for flexible multisigs, filters by the proxy's access type.

A **Clear** control appears once any filter is active.

### Export, deep links, hide/unhide

- **CSV export** downloads exactly the **currently filtered set** (so the active tab and every filter apply), sorted
  newest-first, with a rich column set (status, chain, accounts, method, decoded amount and asset, recipient, call
  hash/data, approval/rejection counts, and the raw events/args). The filename records the tab, date, and item count.
- **Deep link** — every row has a share button; opening the link focuses and expands the exact operation, scrolling it
  into view and switching to its tab.
- **Hide / unhide** — the Advanced panel's eye control hides an operation (moving it to the Hidden tab) or unhides it;
  each action shows a toast with an **Undo**. Hidden ids are remembered across sessions.

## Lifecycle

```mermaid
flowchart TD
    NEW["Operation initiated<br/>(pending)"] --> LIST["Appears in the Pending tab<br/>for every co-signer"]
    LIST --> REVIEW["Co-signer reviews:<br/>details, signatories, log, call data"]
    REVIEW --> ACT{"Co-signer acts"}
    ACT -- "Approve (non-final)" --> WAIT["Records approval;<br/>more still needed"]
    WAIT --> LIST
    ACT -- "Add call data (final signer, call missing)" --> REVIEW
    ACT -- "Approve (reaches threshold)" --> EXEC["Executes the call on-chain → History"]
    ACT -- "Reject (by depositor)" --> CANCEL["Cancelled, deposit returned → History"]
    REVIEW -- "Notify remaining signers" --> NUDGE["Backend reminds still-pending signers"]
    NUDGE --> LIST
```

**Happy path.** An operation is initiated and appears as _pending_ for every co-signer. Each actionable signatory
approves in turn; while the threshold is not yet met, approvals are non-final and just advance the count. The approval
that reaches the threshold is the _final signing_ — it carries the full call data and executes the underlying call,
after which the operation moves to History. Alternatively the depositor can reject the operation, cancelling it.

**Notable failures.**

- **Missing call data on final signing** — the last approver cannot run the real call until its call data is supplied,
  so the row offers _Add call data_ instead of _Approve_; supplying valid call data both decodes the display and
  unblocks the final approval.
- **Network unreachable / operation gone** — approving, rejecting, or deep-linking surfaces an explanatory modal
  (network not available, connection timeout, account or operation not found, already signed) rather than failing
  silently.
- **Nudge rejected** — authorization (403), rate-limit (429), the operation not yet synced by the backend (404), or
  delivery failure are each turned into an explanatory toast; nothing is sent when no signer is still pending.

## Related

- [`multisig-operation-description`](../../aggregates/multisig-operation-description/README.md) — the shared note
  attached to an operation and shown in its Details panel; this view reads, displays, and (on the confirmation/approval
  flows) writes those descriptions.
- **Address-book backend connection** — the same backend that stores descriptions also backs _Notify remaining signers_
  and supplies contact names and external-multisig discovery. The nudge endpoint owns authorization and rate-limiting;
  this view only decides whether to show the button (pending operation + connected backend) and maps the backend's
  response onto a toast. Connection health, reconnection, and session expiry are governed by the backend aggregate.
- **Drafts** — the Pending tab surfaces saved operation drafts awaiting submission alongside live operations, and a
  submitted draft is badged on its resulting operation row.
- **Wallet pairing** — for a tracked external multisig, the per-operation action is an **Add wallet** prompt that pairs
  a wallet holding an actual signatory key, turning the read-only row into an actionable one.
