# Design sources (claude.ai/design)

Design mockups for Nova Spektr screens live in the claude.ai/design project
**[design system for Spektr](https://claude.ai/design/p/ea654f00-008b-4edc-bba5-14d93cf5d45f)**. This folder mirrors the
reviewable sources of that project so the team can read, diff and evolve them through normal PRs. The claude.ai project
stays the place where mockups are _rendered and edited interactively_; this folder is the versioned source of truth for
what was agreed.

## Layout

- `multisig-operations/` — screen mockups (`*.dc.html`, self-describing "design component" pages: template + inline
  prototype logic) and `_design_notes.md`, the designer-facing changelog of conventions and decisions made during the
  Multisig Operations redesign.
  - `Multisig Operations.dc.html` — the canonical redesigned Operations page (table layout, status sections, sorting,
    status filter, drafts integration, reworked expanded panels). Implemented in the app by the
    `feat: multisig operations redesign` change set; the product spec lives in
    `src/renderer/features/multisig-operations/README.md`.
  - `Element Chat.dc.html` — exploratory mockup of an in-app Element (Matrix) chat feature. Not implemented; kept for
    future work.
- `ds-extensions/` — additions layered on top of the generated UI-kit bundle so mockups can faithfully rebuild app
  screens: chain/token icons (from `novasamatech/nova-utils`), and `lib/identicon.js` (a self-contained port of the
  Polkadot identicon + SS58 helpers). `_ds_extensions.json` is the manifest. Keep these when re-syncing the kit into the
  design project.

## What is intentionally NOT here

- The `_ds/nova-spektr-ui-kit-*` bundle inside the claude.ai project — it is _generated from this repository's_
  `shared/ui` + `shared/ui-kit` components by the design-sync bridge and would only rot here. Re-generate and re-upload
  it instead of editing.
- Intermediate exploration pages (`Operations Table Options`, `Operations Action Menu Options`) and the pre-redesign
  screen demo referenced by `_ds_extensions.json` `features[]` — they remain viewable in the claude.ai project; only
  agreed-upon canonical screens are committed.
- Screenshots/uploads — transient review artifacts.

## Working with the mockups

1. Open the project link above (claude.ai account required; ask Stepan for access). Each `*.dc.html` file renders as an
   interactive prototype with editable props (column widths, connection state, role, etc.).
2. To propose a design change: edit in claude.ai/design, then export the changed `*.dc.html` (and `_design_notes.md`
   updates) into this folder in the same PR as the implementation, so mockup and code move together.
3. `*.dc.html` files reference the kit via relative `_ds/...` paths — they are meant to render inside the design
   project, not standalone in a browser. For a standalone-viewable bundle, use the project's export ("standalone") build
   in claude.ai/design.
