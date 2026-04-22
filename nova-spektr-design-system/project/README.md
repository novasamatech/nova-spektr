# Nova Spektr Design System

> Design system for **Nova Spektr** — a Polkadot & Kusama ecosystem Enterprise Desktop application by **Novasama Technologies**.

## Company / Product Context

**Novasama Technologies** builds wallets and infrastructure for the Polkadot & Kusama ecosystem. Their flagship consumer product is **Nova Wallet** (mobile). This project is about **Nova Spektr** — their **Enterprise desktop** app.

**Nova Spektr** is a multi-wallet Electron desktop application supporting:
- Hardware wallets (Polkadot Vault / Parity Signer)
- Multisig accounts (including Flexible Multisig)
- Proxied accounts (Pure / Any / Non-Transfer / Governance / Staking proxies)
- WalletConnect + browser-extension wallets (Polkadot-js, Talisman, SubWallet)
- Cross-chain asset transfers, staking (Asset Hub-based), and OpenGov participation (referenda, voting, delegation, locks)
- **Fellowship** tooling for the Polkadot Collective

**Tech stack**: Electron + React 19 + TypeScript + Vite + Tailwind + Radix UI + Effector (state) + Polkadot-API (PAPI).

## Sources used

- **Codebase**: `nova-spektr/` (attached via File System Access API) — `novasamatech/nova-spektr` on GitHub
  - Theme tokens: `src/renderer/app/styles/theme/default.css`
  - Fonts: `src/renderer/app/styles/fonts.css` + `src/renderer/shared/assets/fonts/{Inter,Manrope}/`
  - Tailwind colors: `tw-config-consts/colors.ts`
  - Tailwind font sizes: `tw-config-consts/font-sizes.ts`
  - Icon/image assets: `src/renderer/shared/assets/images/{navigation,functionals,aesthetics,walletTypes,misc}/`
  - UI components: `src/renderer/shared/ui/`, `shared/ui-kit/`
  - Page shells: `src/renderer/pages/{Assets,Governance,Staking,Fellowship,...}/`
- **Website**: https://novaspektr.io/ (Framer-hosted marketing site)
- **Repo**: `novasamatech/nova-spektr`

---

## Index (manifest)

| File / Folder | What it is |
|---|---|
| `README.md` | This file — brand context, fundamentals, index |
| `colors_and_type.css` | Single-file CSS tokens: colors, type scale, fonts, radii, spacing, shadows |
| `fonts/` | Inter + Manrope woff2 (400/500/600/800 each) — copied from codebase |
| `assets/` | Logos, illustrations, hero imagery |
| `assets/icons/nav/` | 10 left-nav icons (assets, governance, staking, fellowship, …) |
| `assets/icons/func/` | 20+ functional/UI icons (search, copy, close, opengov-vote, …) |
| `assets/icons/aes/` | Aesthetic icons used in empty states / section headers |
| `assets/icons/wallet/` | Wallet-type badges (Nova Wallet, Vault, WalletConnect, Talisman, …) |
| `preview/` | Small HTML "swatch cards" that populate the Design System review tab |
| `ui_kits/spektr-app/` | Hi-fi React/JSX recreation of the Nova Spektr desktop app |
| `SKILL.md` | Agent-Skills manifest — describes this folder for Claude Code / skills |

---

## CONTENT FUNDAMENTALS

Nova Spektr copy is **functional, precise, and quietly technical**. It is an enterprise tool for people who already know what a multisig, a referendum, or a proxy is — it does not explain the ecosystem to them.

- **Voice**: Direct, third-person, no hedging. "Vote", "Delegate", "Stake", "Approve", "Retract". Buttons are verbs; titles are nouns.
- **Casing**:
  - **Sentence case** everywhere — page titles, section titles, buttons, modals. _"Active referendums"_, _"Add proxied wallet"_, _"Unlock available"_.
  - **Title Case** only in the product logotype itself ("Nova Spektr").
- **Pronouns**: Neutral. Prefers **"Your wallet"**, **"Your vote"** (second-person possessive) over "I / me". Avoids "we" except on the marketing site.
- **Tone**: Formal-light. Dry, Polkadot-native. No exclamation marks. No marketing hype inside the app. The website is slightly warmer ("Everything a true Polkadot enthusiast needs") but still restrained.
- **Emoji**: **Never in-app.** Not in empty states, not in toasts, not in copy. Visual warmth comes from the illustration set (computer.webp, empty-list, onboarding illustrations), not glyphs.
- **Unicode icons**: Not used as UI. All icons are SVG from the asset set.
- **Numerics**: Token amounts are shown with full precision + ticker (`12.3456 DOT`). Large counts use compact notation (`1.2K`, `3.4M`). Dates use locale-aware short forms.
- **Addresses**: Always shown truncated middle-ellipsis (`5Grw…8sVY`) with a Copy icon + Identicon.
- **Errors**: Plain, blameless. _"Transaction was rejected"_, _"Network unavailable"_, _"Invalid address"_. No apologies, no "Oops".
- **Empty states**: Short, descriptive, one illustration + one line. _"No referendums found"_, _"Your basket is empty"_.

Representative strings from the codebase: `balances.title`, `governance.title`, `fellowship.title`, `staking.title`, `operations.title`, `settings.title`, `onboarding.welcome.title`.

---

## VISUAL FOUNDATIONS

### Color vibe
A **cool, near-neutral white/grey stage** lit by a single **indigo accent** (`#4649F6`). Semantics are a classical traffic-light triple: green `#01A63E`, amber `#F68F07`, magenta-red `#F52163`. The accent is Polkadot-adjacent (bluish-indigo) without being Polkadot pink. Dark mode scaffolding exists (`:root.dark`) but is currently empty — the app is **light-mode-only** today.

### Palette roles
- **Text**: 3 steps — primary `#363643`, secondary `#79797D`, tertiary `#A4A4AD`. Plus placeholder `#ACACB5` and `chip-text` `#868692`.
- **Surfaces**: App bg `#F8F8FA`, nav bg `#FFFFFF`, cards `#FFFFFF`, soft block bg `rgba(69,69,137,0.04)`.
- **Accent**: Indigo `#4649F6` with hover `#3235B1`, active `#222376`, and a translucent `0.48` inactive variant.
- **Badges**: Pastel pairs — indigo `#E1E2FE`, red `#FEDDE6`, orange `#FEEDDD`, green `#DAF1E1`, lightblue `#E8F5F9`, purple `#F4EEFF`.

### Type
- **Display / titles**: **Manrope** 800 (extra-bold), tight negative tracking (-0.013 to -0.02em). Five sizes: 26/22/17/17/14 px.
- **Body / UI**: **Inter** 500 (body), 600 (buttons & captions). Tracking -0.01em.
- **Captions**: 10px, 600, **+0.75px positive tracking**, usually uppercase.
- Named tokens (see `colors_and_type.css`): `large-title`, `title`, `header-title`, `medium-title`, `small-title`, `caption`, `button-large`, `button-small`, `headline`, `body`, `footnote`, `help-text`.

### Backgrounds / imagery
- App chrome is **flat**. No gradients inside the app.
- **Onboarding** and **empty states** use a small library of soft **webp illustrations** (`computer.webp`, `empty-list.webp`, `no-connection.webp`) — rendered in a restrained cool palette, slightly isometric.
- The **website** uses dark-mode product shots on a near-black background with subtle indigo glow — marketing aesthetic, not app aesthetic.
- **No repeating patterns, no hand-drawn textures, no photography inside the app.**
- **No emoji, ever.**

### Animation
- Minimal. `transition: max-height 0.5s ease-in-out` on the body, and Tailwind's default transitions elsewhere.
- Hover/active states are **color-only**, not motion. No bounce, no spring. No entrance animations on content.
- Radix UI handles modal open/close (fade + very small scale).
- **Never animate DOM swaps** — the codebase explicitly bans this (CLAUDE.md): keep identical structure, toggle classes.

### Hover / press states
- **Hover**: slightly **darker** version of the same color family. Buttons darken (`primary-button-background-hover #3235B1`), secondary fills bump opacity up (6% → 12%), rows get a 4% tinted wash (`--hover`).
- **Active / pressed**: darker still — primary goes `#222376`; secondary fills reach 16% opacity.
- **Focus**: 2px inset indigo ring — `--input-active-shadow: 0 0 0 2px rgba(36,99,235,0.16)`.
- **No shrink / scale on press.** No colored glow.

### Borders
- Hairline `rgba(69,69,137, 0.06)` for container and divider borders — effectively an ink-tinted 6% black.
- Focused inputs shift to `rgba(70,73,246,0.4)` (indigo).
- Negative/warning states use the semantic color at 100%.

### Shadows (two-tier system)
- `--card-shadow` (level 1): `0 3px 4px rgba(69,69,137,0.04), inset 0 -0.5px 0 rgba(69,69,137,0.12)` — used on plates and rows.
- `--card-shadow-level2`: adds a second softer layer for modals and raised surfaces.
- `--knob-shadow`: a dedicated crisper shadow for draggable knobs.
- The inset `-0.5px` line is a signature detail — it gives every card a subtle **bottom hairline** even when there is no border.

### Radii
- **Cards / plates**: 8px (`--radius-md`) is the workhorse; 12px on larger plates.
- **Pills / badges / chips**: fully rounded (`9999px`).
- **Buttons**: 8px default, pill for "chip" variant.
- **Modals**: 16–20px.

### Layout
- **Left navigation** ~240 px wide, white, fixed height, 10-item menu with icon + label.
- **Header** 56 px tall, sentence-case title on the left, context controls on the right.
- **Main column** typically constrained to **736 px** content width (Governance, Staking, Fellowship all use this). Wider surfaces are modal-xxl (69 rem) at most.
- **4-px grid** everywhere (spacing scale: 4/8/12/16/20/24/32/40/48/64).

### Transparency & blur
- Used **sparingly**. The backdrop under modals (`--dim-background`) is `rgba(54,54,67,0.4)` — no blur behind it.
- Translucent accent variants exist (`rgba(70,73,246,0.24)`, `0.48`, `0.72`) for icon-badges and inactive buttons.

### Protection gradients / capsules
- None. The product does not layer text over imagery, so there are no readability gradients. Capsule pills are the only "protected" element — always solid pastel background + solid colored text.

### Cards
- White `#FFF`.
- Radius **8–12 px**.
- `--card-shadow` (subtle drop + inset bottom hairline).
- **No border** by default — the inset shadow replaces it.
- Internal padding 12–16 px horizontal, 12–18 px vertical.

### Fixed elements
- Left nav, top header, and modal overlays are fixed.
- Modals come in five widths: `modal-sm` 23 rem, `modal` 27.5 rem, `modal-lg` 49 rem, `modal-xl` 59 rem, `modal-xxl` 69 rem.

---

## ICONOGRAPHY

Nova Spektr ships its **own hand-crafted SVG icon set** — there is no CDN icon library in use.

- **Format**: All SVGs, inlined as components via a custom `<Icon name="…" />` wrapper (`shared/ui/Icon/Icon.tsx` + `shared/ui/Icon/data/`).
- **Five thematic folders** in the asset tree, all copied into this design system under `assets/icons/`:
  - `nav/` — 10 left-navigation icons (dashboard, assets, governance, staking, fellowship, operations, basket, notifications, address-book, settings)
  - `func/` — 60+ functional/UI icons (search, copy, more, close, checkmark, edit, delete, eye, lock, thumb-up/down, the full `opengov-*` family, …)
  - `aes/` — "aesthetic" decorative icons for section headers and empty states (rocket, hourglass, fellowship, treasury, voting, globe, …)
  - `wallet/` — square rounded wallet-type badges (Nova Wallet, Polkadot Vault, WalletConnect, Talisman, SubWallet, Polkadot-js, proxied, multisig)
  - `chevron/`, `arrows/`, `flags/`, `currency/`, `explorers/`, `ranks/`, `staking/`, `keyTypes/`, `social/`, `confirm/`, `fellowship/`, `mst/` also exist in the source (not all mirrored — pull as needed)
- **Style**: **Stroke-based, 1.5px**, 16-px and 24-px nominal viewports, balanced geometry, rounded end-caps. Color comes entirely from `currentColor` / the Tailwind `text-icon-*` variables — icons are **monochrome** and inherit their surroundings.
- **Wallet-type icons are an exception**: they are **full-color square badges** with `walletType*Background.svg` variants for large hero uses.
- **Emoji**: **never** used as icons.
- **Unicode**: **never** used as icons.
- **PNG icons**: not used in the UI (the only pngs in the tree are webp illustrations).

**Substitutions flagged**: none — all icons in this system come directly from the Nova Spektr codebase. No CDN fallbacks needed.

---

## Caveats / known gaps

- The codebase's `dark.css` is an empty stub — Nova Spektr is **light-mode only** at the moment. If a dark theme is needed, flag it; it has to be designed from scratch.
- Fonts are shipped as **woff2 latin subsets only**. Extended Unicode (CJK, Cyrillic) will fall through to the system stack.
- Some icon folders (`chevron`, `arrows`, `flags`, `currency`, `explorers`, `ranks`, `staking`, `keyTypes`, `social`, `confirm`, `fellowship`, `mst`) were not bulk-copied here — pull them on demand from `nova-spektr/src/renderer/shared/assets/images/<folder>/`.
- The attached marketing site (novaspektr.io) is Framer-hosted and was not rebuilt as a UI kit — only the **desktop app** is covered by the UI kit in this system.
