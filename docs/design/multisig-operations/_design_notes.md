# Multisig Operations — design state

Single DC: `Multisig Operations.dc.html` (Nova Spektr UI kit, light theme). Full-page wallet screen: sidebar + main
list. Design width ~1440; list wrapper has `min-width:1280px` and horizontal scroll (desktop app).

## Conventions

- Accent indigo `#4649f6`; text `#363643`/secondary `#79797d`/tertiary `#a4a4ad`; hairline `#4545890f`; chip grey
  `#4545890f`.
- Icons via `<x-import component-from-global-scope="NovaSpektrUIKit.Icon" name="...">`. Many kit icons carry a
  `text-icon-default` class on the `<svg>`, so a parent `color:` is ignored — force color with CSS
  `.cls svg { color:#... !important }` (see `.nsglyph`, `.nsdocicon`, `.nsgraph`, `.nsdel`). `multisigOutline` &
  `document` glyphs have hardcoded white fill (use on colored bg).
- In HTML attributes `—` is literal — use real "—". `—` only works inside JS data strings.

## Row columns (aligned across draft / in-progress / header, Actions right-edge = 1448)

Left block 480px: op icon + title/chain + Parameter(200px). Right region: submitter(200) + Description(flex,
padding-left:16) + Status(110) + Actions(220) + delete-slot(16) + share(16) + chevron(16).

- Sortable headers: Parameter/Submitter only. **Status & Actions headers removed** (Stepan). Status column: draft
  "DRAFT" pill removed (empty 110px spacer); in-progress keeps threshold pill "X OF Y SIGNED" (no header).
- Sections (Drafts/In progress/…) collapsible via header click.

## Expanded detail panel — action placement (Stepan)

No separate action toolbar strip. Buttons relocated: **Overview account structure** (grey `#79797d` node-fork SVG icon —
root node branching to two nodes, matches Share style) + **Share** icons in the Signatories tab header (right-aligned,
`9f5cdc7646-span` anchor on Overview). Advanced header (right-aligned): **Hide** (only when `op.notDraft`) + **Delete**
(`op.canDelete` = draft && !locked) — so drafts get Delete only, in-progress get Hide only. All `.nstoolbtn` 30px icon
buttons w/ tooltips.

## Draft logic

- Drafts: description mandatory (always shown). Actions = Edit(grey pill)+primary(filled), both flex:1; trash delete
  icon.
- `locked:true` draft → no Edit/Delete, only full-width blue action, lock icon in trash slot.
- Submitter has hover graph icon (`multisigOutline`, tooltip "Overview account structure").

## Description states (in-progress)

- has description → shown (label always visible).
- no description + `inAddressBook:true` → hover-revealed blue "Add description".
- no description + `inAddressBook:false` → hover-revealed disabled grey "Add description" + lock + tooltip "<addr> is
  not in your address book…".
- "Description" label is hover-revealed (class nsadddesc) on empty rows.

## Element Chat — `Element Chat.dc.html`

New feature DC. Keeps the Nova Spektr 240px sidebar (Chat active in bottom nav, badge). Main area has two states via
`signedIn` prop / state.authed:

- **Sign-in**: centered Matrix login card — homeserver (matrix.org) + Edit, @username:homeserver, password, Sign in
  (accent), QR fallback. "Sign in" button flips to chat.
- **Chat**: rooms rail (312px, search + All/Unreads/People chips + room list with unread badges/dots, network globe
  badges) + conversation (header w/ threads/info + **participants menu** opened from member-stack pill in top-right;
  message groups with bullets/mention pill/code/link/image-error/thread chips; day dividers; membership events; composer
  w/ emoji+attach+send, Enter to send) + thread side panel (400px, root + replies + reply composer).
- All chat data is **seeded-random / anonymized** (`genData()` in logic, seed 20260701) — random room names, people,
  generic messages, threads, events; cached in `this._data`. Room header shows member count, not identifiable topic.
  Call button was removed. Participants menu: `participantsOpen` state, per-member online status + Admin/Moderator role
  badges + "Invite people". Sidebar Collapse: working in both DCs (`sidebarCollapsed` state, `toggleSidebar()`).
  Collapsed → 64px icon-only rail (avatar centered, labels/chevrons hidden, badges become an 8px corner dot on the icon;
  bottom arrow flips to `right` = Expand). Nav VMs carry `showLabel/justify/pad/dot/dotColor/showBadge`; aside carries
  `asideW/asidePad/collapseIcon/collapseLabel/collapsePad/collapseJustify`. Tweaks: `signedIn` (bool), `accent`
  (#4649f6/#0dbd8b/#8b5cf6), `density` (comfortable/compact). Avatar color pairs by seeded hash; name colors seeded.
  Messages append live on send.

## Multisig NEXT: rebuild expanded "Operation details" panel per app screenshot — 3 columns: Details (Recipient, Date & Time, Description+Edit) | Signatories (+ Log tab, contacts with SIGNED/UNSIGNED) | Advanced (Call Hash, Call Data, Multisig deposit, Time Point).
