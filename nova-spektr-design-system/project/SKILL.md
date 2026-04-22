---
name: nova-spektr-design
description: Use this skill to generate well-branded interfaces and assets for Nova Spektr (Novasama Technologies), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill first — it contains the content fundamentals, visual foundations, iconography rules, and a manifest of everything else available here.

Other important files:
- `colors_and_type.css` — the single source of truth for tokens. Link it from any HTML artifact you produce.
- `fonts/` — Inter + Manrope woff2 (400/500/600/800 each). Already wired up by `colors_and_type.css`.
- `assets/` — logos, illustrations, and the hand-crafted Nova Spektr SVG icon set (`nav/`, `func/`, `aes/`, `wallet/`). **Use these — do not substitute CDN icons, and never draw your own.**
- `preview/` — per-token reference cards (colors, type, spacing, components, brand).
- `ui_kits/spektr-app/` — React/JSX recreation of the desktop app. Grep this first when building app-shaped designs; copy components rather than re-deriving.

If creating visual artifacts (slides, mocks, throwaway prototypes, marketing pages), copy assets out of this folder into your project and create static HTML files for the user to view. If working on production code in the Nova Spektr codebase itself, read the rules here to become an expert in the brand, then use the existing components from `nova-spektr/src/renderer/shared/ui/` rather than re-implementing.

If the user invokes this skill without any other guidance, ask them what they want to build or design (a marketing page? a new app surface? a deck?), ask a few focused follow-ups, then act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Non-negotiables for anything produced under this brand:
- **No emoji in-app.** Visual warmth comes from the illustration set, not glyphs.
- **No bluish-purple gradients, no hand-drawn SVG icons, no colored left-border cards.** The system is flat, indigo-accented, card-based, with a signature inset bottom hairline shadow.
- **Sentence case** for all UI copy. Buttons are verbs, titles are nouns.
- **Manrope 800** for display, **Inter 500/600** for UI. Tight negative tracking on titles; +0.75px positive tracking on uppercase captions.
- **Light mode only.** A dark theme does not yet exist in the product.
