# Fellowship Use Cases — Nova Spektr

**Persona:** Alice, a Rank V fellowship member with a Polkadot Vault (air-gapped signing device).
She opens Nova Spektr on her desktop, navigates to the Fellowship page, and works through her daily tasks.
Her preferred flow: **accumulate multiple actions into the basket, then sign the whole batch once via Polkadot Vault.**

---

## Context & Setup Assumptions

- Wallet type: **Polkadot Vault** (root derivation, Polkadot Collectives chain)
- Signing methods relevant to test cases:
  - **Direct signing** — transaction is submitted immediately via a QR signing ceremony with PV
  - **Basket** — action is queued; all basket items are signed together in one QR ceremony
- Active membership status can be **Active** or **Passive** (affects salary rates only — it does **not** restrict voting eligibility; voting is gated by account signing permissions and rank threshold)
- Fellowship network: **Polkadot Collectives** (chainId: `0x46ee89aa...`)
- Test chain: **Chopsticks** fork of Polkadot Collectives, providing deterministic referenda, member state, and salary periods for automated testing (see [Test Environment](#test-environment) below)

### Automation Classification

Each use case is tagged with one of:

| Tag | Meaning |
|---|---|
| `[Chopsticks]` | Fully automatable — chain state + UI flow verifiable; chopsticks session required |
| `[Chopsticks → signing]` | Automatable up to the QR screen — verify correct tx details/fee; broadcast requires physical PV device |
| `[DB only]` | Automatable with wallet DB import alone — no active node needed |
| `[Manual]` | Requires physical Polkadot Vault device or is not automatable |

---

## Test Environment

### Chopsticks Chain State Mock

A Chopsticks fork of Polkadot Collectives is provisioned at a known block, providing a deterministic and controllable chain state. The node URL is injected into the app via `interceptChainsWithCollectivesOverride` (see `tests/system/utils/httpInterception.ts`), which intercepts the chains config request and replaces the Polkadot Collectives node URL with the Chopsticks session URL.

**Environment variable:** `CUSTOM_COLLECTIVES_NODE_URL` — set to the Chopsticks session WebSocket URL. In CI this is injected automatically; locally it must be exported before running fellowship tests.

### What the Chopsticks snapshot provides

The snapshot is taken at a block where the following state exists:

- **Fellowship member account** — Alice (Rank V, Active status) with a Polkadot Vault root key matching `tests/system/data/db/fellowship/fellowship-pv-root.json`
- **Active referenda** — at least one promotion referendum (track 1), one retention referendum, one RFC/whitelist referendum, in the `Deciding` phase with non-zero tally
- **Completed referenda** — referenda in various terminal states: Approved, Rejected, TimedOut — with Alice's vote recorded on at least one
- **Salary period** — a registration period is active; Alice is inducted but has not yet requested salary for the current period
- **Other members** — a set of members across ranks I–VI to populate the Members table

### What is and isn't testable automatically

| Capability | Notes |
|---|---|
| Chain state loads (referenda, member info, salary) | ✅ Full auto |
| UI flows up to the QR signing screen | ✅ Full auto — verify correct tx details and fee |
| Transaction broadcast and on-chain state change | ⚠️ Requires Chopsticks block production + a dev account or pre-signed tx |
| QR code scan with physical Polkadot Vault | ❌ Manual only |

> **Note on broadcast:** For now, tests verify that the correct transaction is constructed (confirmation modal shows the right details, fee is non-zero). Actual broadcast verification is tracked separately once a dev/test account key is wired into the CI environment.

---

## 1. Page Load & Navigation

### UC-1.1 Navigate to Fellowship page
**Actor:** Any wallet user
**Precondition:** App is open, any wallet is imported
**Steps:**
1. Click the Fellowship icon in the left navigation sidebar
2. App redirects to `/fellowship/<collectivesChainId>`

**Expected:** Fellowship page loads; the tasks panel (content area, left column) and sidebar (right column) are visible. If the connected wallet has no fellowship member account, the no-account state is shown.

**Signing:** None
**Automation:** `[DB only]`

---

### UC-1.2 Page load — wallet without fellowship account
**Actor:** Alice on a fresh wallet that is not a fellowship member
**Expected:** The tasks panel shows an empty-state message indicating no fellowship account was found for the current network. The right-column overview widget is hidden.

**Automation:** `[DB only]`

---

### UC-1.3 Page load — fellowship member account
**Actor:** Alice (Rank V member)
**Expected:**
- Tasks panel header shows a task count badge with the number of pending personal + unvoted active tasks
- "Personal" group is visible if Alice has pending promotion/retention/salary tasks
- "Active" group is visible with ongoing referenda that Alice has not voted on yet
- "Completed" group is visible (async-loaded) with referenda Alice already voted on
- Right sidebar shows the Fellowship Overview widget with her rank progress bar and "View Details" button

**Automation:** `[Chopsticks]`

---

### UC-1.4 Navigate to invalid fellowship route — redirect to default chain
**Actor:** Any user
**Precondition:** User navigates to `/fellowship/invalid-chain-id` manually or via stale link
**Expected:** App detects the unrecognised `chainId` parameter and redirects to the default Polkadot Collectives chain URL. The fellowship page loads normally. No error screen is shown.

**Automation:** `[DB only]`

---

### UC-1.5 Account exists but not a fellowship member (NoProfile state)
**Actor:** Alice — has an account on Polkadot Collectives chain, but her address is not in the members registry
**Expected:** The profile card in the right sidebar shows a "Not a member" placeholder with a tooltip explaining she has no fellowship profile. Tasks panel shows the no-account empty state. Voting/salary actions are unavailable.

**Automation:** `[Chopsticks]`

---

### UC-1.6 Key-set with Polkadot relay key only — no fellowship account discovered (SPEK-176)
**Actor:** Alice — imported a Polkadot Vault key-set that contains a key for the Polkadot relay chain but has no derived key for the Polkadot Collectives chain
**Precondition:** The wallet was set up with a relay-chain key only; no Collectives-specific derivation exists
**Expected:** The fellowship page shows the no-account empty state. The app does not attempt to use the relay chain key on the Collectives chain. No silent failure or crash occurs. A hint is shown explaining that a Collectives-specific derived key is required.

**Signing:** None
**Automation:** `[DB only]`

---

### UC-1.7 Key-set with Collectives-derived key — fellowship account discovered (SPEK-176)
**Actor:** Alice — imported a Polkadot Vault key-set that contains both a relay chain key and a properly derived key for the Polkadot Collectives chain
**Precondition:** The wallet key-set includes a derivation path targeting the Collectives chain
**Expected:** The fellowship page correctly identifies the Collectives-derived key and loads Alice's fellowship account. Tasks panel and overview widget are shown as normal. The relay chain key is not used for fellowship operations.

**Signing:** None
**Automation:** `[Chopsticks]`

---

## 2. Overview Widget & Overview Modal

### UC-2.1 View rank progress bar
**Actor:** Alice
**Precondition:** Alice is a fellowship member
**Steps:**
1. Observe the right-column overview widget

**Expected:** A segmented progress bar showing ranks I–VI; Alice's current rank (V) is filled; the current-rank segment shows partial fill reflecting her promotion progress percentage. Below the bar: countdown to next rank or "Ready for promotion" label.

**Automation:** `[Chopsticks]`

---

### UC-2.2 Open Overview modal — Ranks tab
**Actor:** Alice
**Steps:**
1. Click "View Details" button in the overview widget
2. Modal opens on the Ranks tab by default

**Expected:** Modal is visible with the title "Fellowship". Three tabs: Ranks, Members, (Codex if feature-flagged). The Ranks tab shows rank cards (I–VI) with requirements.

**Automation:** `[Chopsticks]`

---

### UC-2.3 Browse Members tab
**Actor:** Alice
**Steps:**
1. Open Overview modal (UC-2.2)
2. Click "Members" tab
3. Observe the members table

**Expected:** Table loads member rows (sorted by rank descending by default). Each row shows rank badge, account name/address, active/passive status indicator, and salary amount. Alice's own row is marked with "You".

**Automation:** `[Chopsticks]`

---

### UC-2.4 Search members by name or address
**Actor:** Alice
**Steps:**
1. Open Overview modal → Members tab
2. Type a partial name or address in the search input

**Expected:** Table filters in real time, showing only matching members. Clearing the search restores the full list.

**Automation:** `[Chopsticks]`

---

### UC-2.5 Sort members by rank
**Actor:** Alice
**Steps:**
1. Open Overview modal → Members tab
2. Click "Rank" column header once, then again

**Expected:** Table sorts ascending on first click, descending on second click. Sort indicator arrow updates accordingly.

**Automation:** `[Chopsticks]`

---

### UC-2.6 Sort members by account / status / salary
**Actor:** Alice
**Steps:**
1. Open Overview modal → Members tab
2. Click the "Account", "Status", then "Salary" column headers in turn

**Expected:** Each column header click sorts the table by that column ascending; a second click sorts descending. Sort indicator moves to the active column. Alice's "You" row remains correctly identified regardless of sort order.

**Automation:** `[Chopsticks]`

---

### UC-2.7 Filter members by rank
**Actor:** Alice
**Steps:**
1. Open Overview modal → Members tab
2. Open the rank dropdown and select "Rank III"

**Expected:** Table shows only Rank III members. Row count updates. Clearing or changing the filter restores the appropriate set.

**Automation:** `[Chopsticks]`

---

### UC-2.8 Filter members by active / passive status
**Actor:** Alice
**Steps:**
1. Open Overview modal → Members tab
2. Open the status dropdown and select "Passive"

**Expected:** Table shows only passive members. Count badge updates.

**Automation:** `[Chopsticks]`

---

### UC-2.9 Clear all filters
**Actor:** Alice
**Precondition:** At least one filter or search is active
**Steps:**
1. Click "Clear all" button in the Members tab filter bar

**Expected:** All filters, sort overrides, and search query are reset. Full member list is restored.

**Automation:** `[Chopsticks]`

---

### UC-2.10 Members tab — empty results after filtering
**Actor:** Alice
**Steps:**
1. Enter a search string that matches no member (e.g., `zzzzz`)

**Expected:** The `MembersEmptyState` component is shown with a "no matches" message. The table body is empty; no rows appear.

**Automation:** `[Chopsticks]`

---

### UC-2.11 Open Voting History modal from referendum details
**Actor:** Alice
**Steps:**
1. Open any ongoing referendum's details modal
2. Click the vote count / tally area to open the Voting History modal

**Expected:** `VotesModal` opens showing the full voter list for the referendum, split into Aye and Nay tabs with counts.

**Automation:** `[Chopsticks]`

---

### UC-2.12 Voting History modal — switch tabs, search, empty results
**Actor:** Alice
**Steps:**
1. Open Voting History modal (UC-2.11)
2. Click the "Aye" tab, then the "Nay" tab
3. Type a partial name or address in the search field
4. Enter a query that matches no voter

**Expected:**
- Switching tabs shows the correct voters for each decision, ordered by vote weight descending
- Search filters the active tab's list in real time
- When no results match, an empty-results state is shown

**Automation:** `[Chopsticks]`

---

## 3. Voting on Referenda

### UC-3.1 Open referendum details — Promotion/Retention type
**Actor:** Alice
**Precondition:** Chopsticks snapshot includes an active promotion referendum (track 1) in the Deciding phase
**Steps:**
1. In the "Active" task group, find a promotion referendum item (shows a rank badge)
2. Click anywhere on the item body

**Expected:** Referendum Details modal opens. Shows member name + rank in the title (e.g. "Promote Bob to Rank III"). Left column: description and evidence summary. Right column: member profile card, voting actions (Aye / Nay buttons), and additional info (end block, IPFS link).

**Automation:** `[Chopsticks]`

---

### UC-3.2 Vote Aye on a promotion referendum — Direct signing (Polkadot Vault)
**Actor:** Alice (basket disabled or account not basket-capable)
**Precondition:** Chopsticks snapshot includes an active promotion referendum Alice has not yet voted on; Alice's rank meets the track threshold
**Steps:**
1. Open referendum details for a promotion referendum (UC-3.1)
2. Click "Aye" (Good) button in the voting actions card
3. Confirmation modal appears showing the vote details (referendum ID, vote weight)
4. Verify fee is displayed and non-zero
5. Click "Sign"
6. QR code screen appears; scan with Polkadot Vault app
7. Return the signed QR code; app broadcasts the transaction

**Expected:** Transaction is submitted. On success: the referendum item in the tasks list shows a "voted" indicator; the Aye button becomes checked/highlighted.

**Signing method:** Polkadot Vault (direct)
**Automation:** `[Chopsticks → signing]` — automate steps 1–5 (verify confirmation modal, referendum ID, non-zero fee); QR scan is manual

---

### UC-3.3 Vote Nay on a promotion referendum — Direct signing
**Actor:** Alice
**Steps:** Same as UC-3.2 but clicks "Nay" (Not Good) button.

**Expected:** Same as UC-3.2 but with Nay vote recorded.

**Automation:** `[Chopsticks → signing]`

---

### UC-3.4 Vote on an RFC referendum — Direct signing
**Actor:** Alice
**Precondition:** Chopsticks snapshot includes an active whitelist/RFC referendum (WhitelistProposal type) in the Active group
**Steps:**
1. Click RFC task item (shows document icon, no rank badge)
2. Referendum details modal opens (title: "Referendum #N")
3. Vote Aye or Nay
4. Sign via Polkadot Vault

**Expected:** Vote is recorded for the RFC referendum.

**Automation:** `[Chopsticks → signing]` — automate steps 1–3 (verify modal opens, correct type shown, fee non-zero); QR scan is manual

---

### UC-3.5 Vote on multiple referenda using the basket (primary flow)
**Actor:** Alice — has 5+ active referenda to vote on
**Precondition:** Chopsticks snapshot includes multiple active referenda; Alice's account supports basket (Polkadot Vault root or derived key)
**Steps:**
1. Click first referendum item → Details modal opens
2. Click "Aye" — because basket is available, the vote is added to the basket; modal closes automatically
3. Repeat for all other referenda (Aye or Nay each)
4. Basket counter in the bottom of the tasks panel increments with each addition
5. When done voting, click the basket button / "Sign all" in the basket bar
6. Basket review screen shows all queued transactions with details per item
7. Optionally remove an individual vote from the basket on this screen
8. Confirm the batch; QR signing ceremony via Polkadot Vault
9. All votes are broadcast in one session

**Expected:** All votes submitted in a single signing ceremony. Voted referenda move from "Active" to "Completed" group.

**Signing method:** Polkadot Vault (basket batch)
**Automation:** `[Chopsticks → signing]` — automate steps 1–7 (basket accumulation, counter, review screen); QR scan is manual

---

### UC-3.6 Remove a vote from the basket before signing
**Actor:** Alice
**Precondition:** At least one vote is queued in the basket (build on UC-3.5 state)
**Steps:**
1. Open basket review
2. Click the remove/delete icon on a specific vote item
3. Vote is removed; basket count decreases

**Expected:** Only the removed vote is cleared; all other basket items remain.

**Automation:** `[Chopsticks]`

---

### UC-3.7 Referendum already voted — verify voted state display
**Actor:** Alice
**Precondition:** Chopsticks snapshot includes at least one completed referendum with Alice's vote on record
**Steps:**
1. The referendum appears in the "Completed" group
2. Click on it to open details

**Expected:** Details modal shows VotingButtonsCompleted component; Aye or Nay is displayed as already-voted (checked state). No ability to change vote.

**Automation:** `[Chopsticks]`

---

### UC-3.8 Basket mutation — change Aye vote to Nay before signing
**Actor:** Alice
**Precondition:** Alice added an Aye vote on an active referendum to the basket; has not signed yet
**Steps:**
1. Open the same referendum details
2. Click "Nay"

**Expected:** The existing Aye entry in the basket is replaced by a Nay entry. Basket count stays the same. Basket review shows Nay for that referendum.

**Automation:** `[Chopsticks]`

---

### UC-3.9 Basket mutation — click same vote again removes it from basket
**Actor:** Alice
**Precondition:** Alice added an Aye vote on an active referendum to the basket; has not signed yet
**Steps:**
1. Open the referendum details; the Aye button is shown as checked (basket state)
2. Click "Aye" again

**Expected:** The basket entry is removed. Basket count decreases by one. Both buttons return to unselected state.

**Automation:** `[Chopsticks]`

---

### UC-3.10 Self-vote suppression — proposer cannot vote on own referendum
**Actor:** Alice
**Precondition:** Chopsticks snapshot includes a referendum that Alice proposed (she is the submitter)
**Expected:** When Alice opens the referendum details, the voting action buttons (Aye / Nay) are **not rendered**. She cannot vote on her own referendum. The VotingActions component returns null for `isCurrentUser === true`.

**Automation:** `[Chopsticks]`

---

### UC-3.11 Whitelist referendum — connected governance card
**Actor:** Alice
**Precondition:** Chopsticks snapshot includes an active whitelist referendum (WhitelistProposal type) with a linked governance referendum ID
**Steps:**
1. Open the whitelist referendum details modal
2. Observe the connected governance summary card
3. Click "View referendum" button

**Expected:**
- A summary card appears with an AI-generated governance referendum summary (markdown)
- A governance referendum card shows title, voting status badge, and end timer
- Clicking "View referendum" navigates to the linked governance referendum in the Governance section
- Below the separator: call hash is displayed (truncated), with a copy button
- "View JSON" opens a modal with formatted `proposalJSON` call data

**Automation:** `[Chopsticks]`

---

### UC-3.12 Completed referendum — terminal status labels
**Actor:** Alice
**Precondition:** Chopsticks snapshot includes completed referenda in at least Approved, Rejected, and TimedOut terminal states
**Expected:** Each completed referendum item in the tasks list shows the correct status label and icon:
- **Approved** → checkmark icon + "Approved" label
- **Rejected** → checkmark icon + "Rejected" label
- **TimedOut** → clock icon + "Timed Out" label
- **Cancelled** → checkmark icon + "Cancelled" label
- **Killed** → checkmark icon + "Killed" label

**Automation:** `[Chopsticks]`

---

### UC-3.13 Referendum in queue (inQueue state)
**Actor:** Alice
**Precondition:** Chopsticks snapshot includes a referendum that is queued but not yet in the Deciding phase
**Expected:** The referendum item is visible in the Active group. The details modal shows the referendum without a tally section (no aye/nay counts yet). The status indicator or end-block timer reflects the queued state.

**Automation:** `[Chopsticks]`

---

## 4. Evidence Submission (Promotion / Retention)

### UC-4.1 Submit promotion evidence — from scratch
**Actor:** Alice (eligible for promotion to Rank VI)
**Precondition:** Chopsticks snapshot has Alice at Rank V with sufficient time served; "Request Promotion" task appears in the Personal group
**Steps:**
1. In the "Personal" task group, click the action button on the "Request Promotion" task
2. Evidence popover/modal opens with wish type "Promotion" pre-selected
3. Select "Write from scratch" flow
4. Fill in the "Areas of contribution" field
5. Fill in the "Evidence summary" (markdown-supported)
6. Optionally add "Additional comments"
7. Click "Preview" to see the rendered markdown
8. Click "Submit"
9. Confirmation modal shows the evidence transaction details
10. Sign via Polkadot Vault

**Expected:** Evidence is submitted on-chain. Alice's personal task for promotion is updated (shows "Edit" and "View" buttons instead of "Submit").

**Automation:** `[Chopsticks → signing]` — automate steps 1–9 (form fill, preview, confirmation details); QR scan is manual

---

### UC-4.2 Submit promotion evidence — via IPFS CID or URL
**Actor:** Alice (has a pre-existing IPFS document)
**Steps:**
1. Open promotion evidence flow (UC-4.1 steps 1–2)
2. Select "Use IPFS link" flow
3. Paste the IPFS CID or URL
4. App fetches and previews the document content
5. Submit; confirmation modal appears; sign via Polkadot Vault (direct) or add to basket

**Expected:** Evidence is submitted on-chain.

**Automation:** `[Chopsticks → signing]`

---

### UC-4.3 Submit promotion evidence — via local markdown file upload
**Actor:** Alice (has evidence written in a local `.md` file)
**Steps:**
1. Open promotion evidence flow → select IPFS/upload path
2. Click the upload button in `IPFSUploadModal`
3. Select a `.md` file from the local filesystem
4. App reads the file and shows a preview of the markdown content
5. Submit; sign via Polkadot Vault or add to basket

**Expected:** The file content is read; preview renders correctly. Evidence submitted with the file's content hash.

**Automation:** `[Chopsticks → signing]`

---

### UC-4.4 IPFS/upload preview step — navigate back before submitting
**Actor:** Alice
**Steps:**
1. Reach the `MarkdownPreviewModal` step (either from IPFS URL or file upload)
2. Click "Back"

**Expected:** User returns to the upload/input step. Previously entered CID or selected file is preserved (or cleared, per implementation). Alice can modify and re-preview before submitting.

**Automation:** `[Chopsticks]`

---

### UC-4.5 Evidence submission — add to basket
**Actor:** Alice
**Precondition:** Alice's account supports basket
**Steps:**
1. Complete the evidence form (from scratch, IPFS, or file upload)
2. In the `EvidencePostModal` confirmation step, click "Add to basket" instead of "Sign"

**Expected:** Evidence transaction is added to the basket. Success toast shows "Added to basket". Basket counter increments. Evidence flow closes.

**Automation:** `[Chopsticks]`

---

### UC-4.6 Edit existing promotion evidence
**Actor:** Alice (has already submitted evidence)
**Steps:**
1. Promotion task in Personal group shows "Edit" button
2. Click "Edit"
3. Evidence form opens pre-filled with existing content
4. Modify the summary text
5. Submit; sign via Polkadot Vault

**Expected:** Updated evidence is posted on-chain, replacing the previous submission.

**Automation:** `[Chopsticks → signing]`

---

### UC-4.7 View submitted evidence
**Actor:** Alice
**Steps:**
1. Click "View" button on the promotion or retention task

**Expected:** Markdown preview modal opens with the full evidence content rendered.

**Automation:** `[Chopsticks]`

---

### UC-4.8 Submit retention evidence
**Actor:** Alice (retention deadline is approaching; "Request Retention" task appears)
**Precondition:** Chopsticks snapshot has Alice's demotion period nearing expiry so the "Request Retention" task appears in the Personal group
**Steps:**
1. Click action button on "Request Retention" task
2. Select wish type "Retention" (pre-selected)
3. Fill in the retention evidence form
4. Submit; sign via Polkadot Vault or add to basket

**Expected:** Retention evidence submitted; demotion timer is reset. Task item updates.

**Automation:** `[Chopsticks → signing]`

---

### UC-4.9 Vote on another member's evidence
**Actor:** Alice
**Precondition:** Chopsticks snapshot includes a promotion referendum for another member (Bob) that Alice is eligible to vote on
**Steps:**
1. In the "Active" group, click a "Promote Bob to Rank III" evidence item
2. Details modal opens (left: evidence summary; right: VotingActionsCard with Aye/Nay)
3. Vote Aye or add to basket

**Automation:** `[Chopsticks → signing]`

---

### UC-4.10 Batch evidence votes using basket
**Actor:** Alice — has multiple evidence voting tasks
**Steps:** Same as UC-3.5 but for evidence-voting tasks (`COLLECTIVE_EVIDENCE_VOTE` type).

**Expected:** All evidence votes queued and signed in a single Polkadot Vault ceremony.

**Automation:** `[Chopsticks → signing]`

---

### UC-4.11 Self-vote suppression — proposer cannot vote on own evidence
**Actor:** Alice
**Precondition:** Chopsticks snapshot has Alice's own promotion evidence already submitted and the resulting referendum active
**Expected:** When Alice views her own evidence task or the resulting referendum, the Aye/Nay voting buttons are **not rendered** for her. The `VotingActions` component hides actions when `isCurrentUser === true`.

**Automation:** `[Chopsticks]`

---

### UC-4.12 Evidence conflict alert — promotion while retention referendum exists
**Actor:** Alice
**Precondition:** Chopsticks snapshot has an active retention referendum for Alice
**Steps:**
1. Alice tries to submit promotion evidence

**Expected:** A warning alert is shown in the evidence form (via `EvidenceWarningAlerts`) indicating a promotion evidence cannot be submitted while a retention referendum exists. The submit action is blocked or disabled.

**Automation:** `[Chopsticks]`

---

### UC-4.13 Evidence conflict alert — retention while promotion referendum exists
**Actor:** Alice
**Precondition:** Chopsticks snapshot has an active promotion referendum for Alice
**Steps:**
1. Alice tries to submit retention evidence

**Expected:** A warning alert is shown indicating a retention request cannot be submitted while a promotion referendum exists.

**Automation:** `[Chopsticks]`

---

### UC-4.14 Evidence IPFS fetch — timeout shows empty preview (SPEK-173, SPEK-230)
**Actor:** Alice (using IPFS link flow)
**Precondition:** The IPFS gateway is slow or unresponsive; the hash is syntactically valid but content cannot be retrieved within the timeout window
**Steps:**
1. Open promotion evidence flow → select "Use IPFS link"
2. Paste a valid-format CID that points to an unreachable or timing-out gateway
3. Wait for the fetch timeout to expire

**Expected:** After the timeout, the preview step shows an empty/placeholder state rather than hanging indefinitely. An error message indicates the content could not be loaded. Alice can either retry or go back and use a different CID. The "Submit" button is disabled until valid content is loaded.

---

### UC-4.15 Evidence IPFS fetch — primary gateway fails, fallback succeeds (SPEK-230)
**Actor:** Alice (using IPFS link flow)
**Precondition:** The primary IPFS gateway is unavailable; a fallback gateway can serve the content
**Steps:**
1. Open promotion evidence flow → select "Use IPFS link"
2. Paste a valid CID whose primary gateway returns an error
3. App transparently retries via fallback gateway(s)

**Expected:** The content eventually loads and the preview renders correctly without any user intervention. The fetch failure on the primary gateway is not shown as a user-facing error as long as a fallback succeeds.

---

### UC-4.16 Evidence task — referendum not yet created on-chain (SPEK-174)
**Actor:** Alice
**Precondition:** Alice submitted promotion evidence; the evidence was accepted but the corresponding fellowship referendum has not yet been created on-chain
**Expected:** The promotion task in the Personal group reflects a "pending referendum creation" state. The task item indicates that evidence was submitted and a referendum is being created. The voting action buttons are not shown until the referendum exists. No error is displayed.

---

## 5. Profile Management

### UC-5.1 Toggle Active status to Passive
**Actor:** Alice (currently Active, going on leave)
**Precondition:** Chopsticks snapshot has Alice with Active status
**Steps:**
1. Find the Active/Inactive toggle in the right sidebar profile card
2. Click toggle to switch from Active → Passive
3. Confirmation modal shows the `setActive(false)` transaction details and fee
4. Sign via Polkadot Vault

**Expected:** Alice's membership status changes to Passive. The profile card reflects "Passive" status. Her salary rate switches to the passive rate.

**Automation:** `[Chopsticks → signing]`

---

### UC-5.2 Toggle Passive status back to Active
**Actor:** Alice (returning from leave)
**Steps:** Same as UC-5.1 but toggling Passive → Active.

**Expected:** Status changes to Active; active salary rate applies.

**Automation:** `[Chopsticks → signing]`

---

### UC-5.3 Toggle Active status using basket
**Actor:** Alice (wants to batch with other transactions)
**Steps:**
1. Add setActive toggle to basket (basket-capable account)
2. Basket counter increments
3. Sign with the batch at the end of the session

**Automation:** `[Chopsticks]`

---

### UC-5.4 Profile status-switch — button disabled for no-permission accounts
**Actor:** Alice using a watch-only wallet
**Precondition:** The selected account does not have signing permissions (e.g., watch-only)
**Expected:** The "Set Active / Set Passive" button in `ProfileModal` is disabled. No confirmation modal opens. A tooltip or visual cue indicates the account cannot perform this action.

**Automation:** `[DB only]`

---

### UC-5.5 Profile alert — promotion or retention succeeded
**Actor:** Alice
**Precondition:** Alice's rank was recently changed (promotion accepted)
**Expected:** The profile card or alert banner shows a "Promoted to Rank VI" notification. The alert can be dismissed; dismissal is persisted (not shown again on reload).

---

### UC-5.6 Profile alert — promotion or retention failed
**Actor:** Alice
**Precondition:** Alice's promotion or retention referendum was rejected
**Expected:** A "Promotion failed" or "Retention failed" alert banner is shown. Alice is advised to resubmit evidence.

---

### UC-5.7 Profile alert — rank bumped after auto-demotion
**Actor:** Alice
**Precondition:** Alice's rank was automatically reduced (demotion period expired without evidence)
**Expected:** A "bumped" alert is shown indicating her rank decreased. Activity feed shows a "Demoted" event.

---

### UC-5.8 Activity feed — events list
**Actor:** Alice
**Steps:**
1. Locate the activity feed widget in the right sidebar (below the profile card)

**Expected:** Shows recent on-chain events for Alice's membership:
- Votes cast
- Rank changes (promotion, demotion, retention)
- Status changes (active ↔ passive)
- Evidence submissions
- Salary events (paid)

---

### UC-5.9 Activity feed — no events state
**Actor:** Alice (new member with no on-chain activity)
**Expected:** The `ActivityPlaceholder` component is shown inside the activity feed with a "No activity yet" message.

---

### UC-5.10 Activity feed — absolute date for older events
**Actor:** Alice
**Precondition:** At least one activity event is older than one month
**Expected:** Events within the last month show relative dates (e.g., "3 days ago"). Events older than one month show an absolute date (e.g., "Jan 5, 2025").

---

### UC-5.11 Expand activity feed — full history modal
**Actor:** Alice
**Steps:**
1. Click "See all" / expand button in the activity feed widget

**Expected:** Full activity history modal opens with a paginated/scrollable list of all events.

---

## 6. Salary Management

### UC-6.1 Register (induct) into the salary system
**Actor:** Alice (new member not yet enrolled in salary)
**Precondition:** Chopsticks snapshot has Alice as a fellowship member not yet inducted into salary; "Register for Salary" task appears in Personal group
**Steps:**
1. Click the action button on "Register for Salary" task
2. Confirmation modal shows `salaryInduct` transaction
3. Sign via Polkadot Vault or add to basket

**Expected:** Alice is inducted into the salary system. The "Register for Salary" task disappears; "Request Salary" task may appear.

**Automation:** `[Chopsticks → signing]`

---

### UC-6.2 Request salary for the current period
**Actor:** Alice
**Precondition:** Chopsticks snapshot is in a salary registration period; Alice is inducted but has not yet requested for this period
**Steps:**
1. Click action button on "Request Salary" task
2. Task shows current period end date and salary amount
3. If basket-capable: click → added to basket
4. If not: confirmation modal → sign via Polkadot Vault

**Expected:** Salary registration for the current period is submitted. Task updates to reflect "requested" state. The SalaryInfo card shows time to next payout and a success indicator.

**Automation:** `[Chopsticks → signing]`

---

### UC-6.3 Claim salary payout
**Actor:** Alice
**Precondition:** Chopsticks snapshot is in a payout period; Alice has an unclaimed payout available
**Steps:**
1. Click action button on "Claim Payout" task
2. Confirmation shows payout amount and fee
3. Sign via Polkadot Vault or add to basket

**Expected:** Payout transaction submitted. Funds transferred to Alice's beneficiary account.

**Automation:** `[Chopsticks → signing]`

---

### UC-6.4 Salary period state — registration period CTA
**Actor:** Alice (inducted, registration period active, not yet requested)
**Expected:** The SalaryInfo card shows:
- Time remaining until registration period ends
- Current salary amount
- "Request Salary" button enabled

---

### UC-6.5 Salary period state — payout period CTA
**Actor:** Alice (salary registered in previous period; payout period now active)
**Expected:** The SalaryInfo card shows:
- "Claim Payout" button enabled with the claimable amount
- Time remaining in payout period

---

### UC-6.6 Salary info — rank 0 member insufficient rank state
**Actor:** Alice (rank 0, e.g., just inducted with no rank yet)
**Expected:** The SalaryInfo card shows the `insufficientRank` message instead of salary actions. No request/payout buttons are shown.

---

### UC-6.7 Salary basket toggle — add and remove induct / request / payout
**Actor:** Alice (basket-capable account)
**Steps:**
1. Trigger `salaryInduct`, `salaryRequest`, or `salaryPayout` flow
2. Click "Add to basket" in the confirmation step
3. Confirm the item appears in the basket
4. From the basket review, remove the salary item

**Expected:** Each salary operation can be added to and removed from the basket independently. Basket count reflects the correct total.

---

### UC-6.8 Batch salary operations using basket
**Actor:** Alice
**Precondition:** Both "Request Salary" and another task (e.g., a vote) are pending
**Steps:**
1. Add "Request Salary" to basket
2. Add 3 referendum votes to basket
3. Review basket (4 items total: 1 salary + 3 votes)
4. Sign all via Polkadot Vault

**Expected:** All 4 transactions submitted in one signing ceremony.

---

### UC-6.9 View salary info in profile sidebar
**Actor:** Alice
**Expected:** The profile card in the right sidebar shows:
- Current salary rate (active or passive)
- Period end date
- Claimable amount (if payout is available)

---

### UC-6.10 Beneficiary management — change payout account
**Actor:** Alice
**Steps:**
1. In the SalaryInfo card, click the beneficiary edit button to open `SalaryEditBeneficiaryModal`
2. Search for an account by name or address
3. Select a different eligible account from the combobox (must be on the correct chain, not watch-only)
4. Confirm the selection

**Expected:** The beneficiary account updates. Watch-only accounts and accounts on wrong chains are excluded from the list. Payout confirmation will use the newly selected beneficiary.

---

## 7. Demotion Risk

### UC-7.1 View demotion countdown
**Actor:** Alice (approaching demotion deadline)
**Precondition:** Alice has not submitted retention evidence; demotion period is nearing expiry
**Expected:** The retention widget or profile section shows a countdown (blocks or estimated days) until auto-demotion. The countdown is derived from `$leftToDemotion` based on `lastProof` and current block.

---

### UC-7.2 Auto-demotion — activity event and rank change
**Actor:** Alice (demotion period has passed without evidence)
**Expected:** Alice's rank is automatically reduced by one on-chain. The activity feed shows a "Demoted" event. The "bumped" profile alert is displayed. The profile card reflects the new lower rank.

---

## 8. Cross-Feature Basket Scenarios

### UC-8.1 Full session: 5 votes + 1 retention evidence + 1 salary request (basket)
**Actor:** Alice, busy Monday
**Steps:**
1. Navigate to Fellowship page
2. Add retention evidence to basket
3. Add "Request Salary" to basket
4. Open 5 active referendum items; vote Aye/Nay on each → all go to basket
5. Total basket count: 7
6. Open basket review; verify all 7 items are present and correctly labelled
7. Confirm; scan QR code once with Polkadot Vault
8. All 7 transactions broadcast

**Expected:** Single QR ceremony covers all 7 transactions. No re-scanning required.

---

### UC-8.2 Basket validation — stale vote removed
**Actor:** Alice
**Precondition:** Alice queued a vote on referendum #42, which then ended before she signed
**Steps:**
1. Open basket review
2. App validates each queued transaction against current chain state
3. Referendum #42 is completed; the item is flagged with an error "Referendum no longer valid"
4. Alice removes the invalid item or the app removes it automatically

**Expected:** Invalid item does not get submitted; remaining items are signed successfully.

---

### UC-8.3 Sign basket via Nova Wallet (alternative)
**Actor:** Alice (using Nova Wallet extension as an alternative signer)
**Steps:**
1. Queue votes in basket
2. Open basket review
3. Choose "Sign with Nova Wallet" (if available as signing option)
4. Approve in the Nova Wallet extension popup

**Expected:** Same result as Polkadot Vault path but through extension approval flow.

---

## 9. Feature Flag Scenarios

### UC-9.1 Codex tab — visible when feature flag is enabled
**Actor:** Alice (developer or tester with `codex: true` flag set)
**Steps:**
1. Enable the `codex` feature flag
2. Open Overview modal (UC-2.2)
3. Click the "Codex" tab

**Expected:** The Codex tab is rendered as the third tab in the modal. Alice can:
- Search codex content by keyword (results highlighted in the rendered markdown)
- Navigate via the table of contents
- Use prev/next navigation to jump between search matches

---

### UC-9.2 Basket feature disabled — all flows use direct signing
**Actor:** Alice (with `basket: false` flag)
**Expected:** No "Add to basket" buttons are shown in any confirmation modal. All vote, evidence, and salary flows proceed directly to the QR signing ceremony. No basket counter or basket review screen appears.

---

## 10. Error & Edge Cases

### UC-10.1 No fellowship connection — inactive network
**Actor:** Alice
**Precondition:** Polkadot Collectives node is disconnected (do not start the Chopsticks session, or intercept with an unreachable URL)
**Expected:** The tasks panel shows a loader, then the `InactiveNetwork` overlay replaces the content area. Alice cannot perform any actions until the connection is restored.

**Automation:** `[DB only]` — import wallet DB, intercept chains config with an unreachable node URL

---

### UC-10.2 Insufficient rank to vote
**Actor:** Alice attempts to vote on a referendum that requires a higher rank than she holds
**Precondition:** Chopsticks snapshot includes a referendum on a track that requires rank higher than Alice's (e.g. a rank VI track when Alice is rank V)
**Expected:** Aye/Nay buttons are disabled. A footnote below the buttons reads the rank threshold error message. The buttons are visually dimmed. Note: Active/Passive status does **not** affect this gate — only rank and account signing permissions are checked.

**Automation:** `[Chopsticks]`

---

### UC-10.3 Already voted — attempt to vote again (direct, non-basket)
**Actor:** Alice
**Precondition:** Chopsticks snapshot includes an active referendum with Alice's on-chain vote already recorded (Aye)
**Expected:** In the referendum details modal, the Aye button is shown as checked/active. Clicking Aye again does nothing (same-vote guard: `if (alreadyThatVote) return`). Nay is available to cast a different vote.

**Automation:** `[Chopsticks]`

---

### UC-10.4 Evidence submission failed — IPFS unavailable
**Actor:** Alice (using IPFS flow)
**Steps:**
1. Open evidence flow with IPFS option
2. Enter an unreachable or invalid IPFS hash

**Expected:** An error is shown in the preview step; Alice cannot proceed to submit until a valid IPFS document is found.

---

### UC-10.5 Referendum description fails to load — empty state shown (SPEK-173)
**Actor:** Alice
**Precondition:** A referendum's external metadata (from Polkassembly or Subsquare) returns a 5xx error or times out
**Steps:**
1. Open a referendum details modal whose external description cannot be fetched

**Expected:** After the timeout elapses, the description area shows an empty/placeholder state rather than a spinner. The Aye/Nay voting action buttons remain accessible and functional. No crash or blank screen occurs.

---

### UC-10.6 Referendum details — metadata unavailable but technical section still visible (SPEK-174)
**Actor:** Alice
**Precondition:** A referendum's off-chain metadata cannot be fetched, but on-chain data is available
**Steps:**
1. Open a referendum details modal where the metadata fetch fails

**Expected:** The technical section of the details modal remains visible and shows the referendum ID, track number, and call hash even when the human-readable description cannot be loaded. The "View JSON" button for raw call data is also accessible. Alice can still vote.

---

---

## 11. QR Signing Compatibility (Polkadot Vault Old vs New App)

The Polkadot Vault app has two QR encoding formats — a legacy format (older app versions) and an updated format (current app versions). Nova Spektr must generate the correct QR code depending on which app version Alice is using. The signing mode (old vs new) is selected by Alice in the app settings or detected automatically.

These use cases apply across all direct-signing flows (voting, evidence, salary, active/passive toggle). The basket batch cases are called out separately because the batch encoding differs between formats.

---

### UC-11.1 Direct signing — old Polkadot Vault app (legacy QR format)
**Actor:** Alice — has configured "old" Polkadot Vault signing mode in Nova Spektr
**Precondition:** A signable action is ready (e.g. a vote confirmation)
**Steps:**
1. Proceed through any direct-signing confirmation modal to the QR screen
2. Observe the QR code displayed
3. Scan with the old version of the Polkadot Vault app

**Expected:** The QR code is encoded in the legacy format compatible with the old Polkadot Vault app. The PV app successfully parses and presents the transaction for approval. After signing and returning the signed QR, Nova Spektr broadcasts the transaction successfully.

**Signing method:** Polkadot Vault (direct, legacy format)

---

### UC-11.2 Direct signing — new Polkadot Vault app (updated QR format)
**Actor:** Alice — has configured "new" Polkadot Vault signing mode in Nova Spektr
**Precondition:** A signable action is ready (e.g. a vote confirmation)
**Steps:**
1. Proceed through any direct-signing confirmation modal to the QR screen
2. Observe the QR code displayed
3. Scan with the current version of the Polkadot Vault app

**Expected:** The QR code is encoded in the updated format compatible with the current Polkadot Vault app. The PV app successfully parses and presents the transaction for approval. After signing and returning the signed QR, Nova Spektr broadcasts the transaction successfully.

**Signing method:** Polkadot Vault (direct, new format)

---

### UC-11.3 Basket batch signing — old Polkadot Vault app (legacy QR format)
**Actor:** Alice — has configured "old" Polkadot Vault signing mode; has 3+ items queued in the basket
**Steps:**
1. Queue multiple transactions in the basket (e.g. 3 votes)
2. Open basket review and confirm
3. QR code screen appears for the batch
4. Scan with the old version of the Polkadot Vault app

**Expected:** The batch QR is encoded in the legacy format. The old PV app decodes all transactions in the batch, presents them for approval, and returns a signed QR. Nova Spektr broadcasts all transactions.

**Signing method:** Polkadot Vault (basket batch, legacy format)

---

### UC-11.4 Basket batch signing — new Polkadot Vault app (updated QR format)
**Actor:** Alice — has configured "new" Polkadot Vault signing mode; has 3+ items queued in the basket
**Steps:**
1. Queue multiple transactions in the basket (e.g. 3 votes)
2. Open basket review and confirm
3. QR code screen appears for the batch
4. Scan with the current version of the Polkadot Vault app

**Expected:** The batch QR is encoded in the updated format. The new PV app decodes all transactions in the batch, presents them for approval, and returns a signed QR. Nova Spektr broadcasts all transactions.

**Signing method:** Polkadot Vault (basket batch, new format)

---

---

## Summary Matrix

| Use Case | Transaction Type | Signing Method | Basket-compatible | Automation |
|---|---|---|---|---|
| UC-3.2/3.3 Vote Aye/Nay (direct) | `COLLECTIVE_VOTE` | Polkadot Vault direct | Yes | Chopsticks → signing |
| UC-3.4 Vote RFC | `COLLECTIVE_VOTE` | Polkadot Vault direct | Yes | Chopsticks → signing |
| UC-3.5 Batch votes | `COLLECTIVE_VOTE` ×N | Polkadot Vault basket | Yes | Chopsticks → signing |
| UC-3.8 Replace Aye→Nay in basket | `COLLECTIVE_VOTE` | Polkadot Vault basket | Yes | Chopsticks |
| UC-4.1/4.3 Submit promotion evidence | `COLLECTIVE_SUBMIT_EVIDENCE` | Polkadot Vault direct/basket | **Yes** | Chopsticks → signing |
| UC-4.8 Submit retention evidence | `COLLECTIVE_SUBMIT_EVIDENCE` | Polkadot Vault direct/basket | **Yes** | Chopsticks → signing |
| UC-4.9/4.10 Vote on evidence | `COLLECTIVE_EVIDENCE_VOTE` | Polkadot Vault basket | Yes | Chopsticks → signing |
| UC-5.1/5.2 Set Active/Passive | `COLLECTIVE_SET_ACTIVE` | Polkadot Vault direct/basket | Yes | Chopsticks → signing |
| UC-6.1 Salary induct | `COLLECTIVE_SALARY_INDUCT` | Polkadot Vault direct/basket | Yes | Chopsticks → signing |
| UC-6.2 Request salary | `COLLECTIVE_SALARY_REQUEST` | Polkadot Vault direct/basket | Yes | Chopsticks → signing |
| UC-6.3 Claim payout | `COLLECTIVE_SALARY_PAYOUT` | Polkadot Vault direct/basket | Yes | Chopsticks → signing |
| UC-8.1 Full session batch | Mixed ×7 | Polkadot Vault basket | Yes | Chopsticks → signing |
| UC-11.1 Direct signing — old PV app | Any | Polkadot Vault direct (legacy QR) | No | Manual |
| UC-11.2 Direct signing — new PV app | Any | Polkadot Vault direct (new QR) | No | Manual |
| UC-11.3 Basket batch — old PV app | Mixed ×N | Polkadot Vault basket (legacy QR) | Yes | Manual |
| UC-11.4 Basket batch — new PV app | Mixed ×N | Polkadot Vault basket (new QR) | Yes | Manual |

### Read-only & Edge Cases (no transaction)

| Use Case | Scenario | Automation | Jira |
|---|---|---|---|
| UC-1.2 | Wallet without fellowship account | DB only | — |
| UC-1.4 | Invalid route redirect | DB only | — |
| UC-1.6 | Relay key only — no fellowship account | DB only | SPEK-176 |
| UC-1.7 | Collectives-derived key — account discovered | Chopsticks | SPEK-176 |
| UC-3.7 | Completed referendum — voted state display | Chopsticks | — |
| UC-3.10 | Self-vote suppression | Chopsticks | — |
| UC-3.11 | Whitelist referendum — connected governance card | Chopsticks | — |
| UC-3.12 | Completed referendum — terminal status labels | Chopsticks | — |
| UC-4.12/4.13 | Evidence conflict alerts | Chopsticks | — |
| UC-10.1 | No node connection — inactive network overlay | DB only | — |
| UC-10.2 | Insufficient rank — voting buttons disabled | Chopsticks | — |
| UC-10.3 | Already voted — checked state, no re-vote | Chopsticks | — |
| UC-4.14 | IPFS fetch timeout — empty preview | Chopsticks | SPEK-173, SPEK-230 |
| UC-4.15 | IPFS primary gateway fails, fallback succeeds | Chopsticks | SPEK-230 |
| UC-4.16 | Evidence submitted, referendum not yet created | Chopsticks | SPEK-174 |
| UC-10.5 | Referendum external description fails to load | Chopsticks | SPEK-173 |
| UC-10.6 | Metadata unavailable but technical call data visible | Chopsticks | SPEK-174 |
