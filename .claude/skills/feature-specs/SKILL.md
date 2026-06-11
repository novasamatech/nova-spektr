---
name: feature-specs
description:
  Maintain feature spec READMEs and the Feature Map index. Use when creating a new feature or aggregate, materially
  changing the behaviour of an existing one, writing or updating a spec README, or when asked about feature
  documentation coverage.
---

# Feature Specs & Feature Map Maintenance

Non-trivial features (`src/renderer/features/`) and aggregates (`src/renderer/aggregates/`) carry a colocated
`README.md` — a **product spec** of what the code does and why (states, scenarios, lifecycle), not how it is wired. All
specs are indexed in the **Feature Map**: `src/renderer/features/README.md`.

The canonical human-facing convention (what goes in a spec, the author-approval workflow) is
`docs/content/docs/code/style/feature-specs.md` — read it before writing a spec. Worked example:
`src/renderer/aggregates/multisig-operation-description/README.md`.

## When a spec is required

- New feature/aggregate with user-visible behaviour or non-obvious rules → write one.
- Material behaviour change (new states, new gating, changed flow) → update the existing spec **in the same change**.
- Skip for trivial, presentation-only, or purely mechanical modules.
- Before changing any feature: read its README first if it exists — it is the source of product truth. If the code
  contradicts it, surface that.
- A draft spec must be approved by the feature's author before the change is finalized — treat the spec as a deliverable
  alongside the code.

## Spec README structure

Use the template from the canonical convention doc (`docs/content/docs/code/style/feature-specs.md`, section "Template")
— do not restate it here; the doc is the single source for the spec's structure.

One addition the template already includes but is easy to miss: the **backlink line is mandatory**, sits right after the
`# Title` heading, and carries the **`Last reviewed` date**:

```markdown
> Part of the [Feature Map](../README.md) — Last reviewed: YYYY-MM-DD
```

(from `aggregates/<name>/` the path is `../../features/README.md`). Match the depth to the feature — a small one needs
only Overview + States.

**Date rules** (stamp with today's date, `date +%F`):

- Creating a spec → set the date.
- Updating a spec → bump the date.
- Changing a module's code while the spec stays accurate → re-read the spec, confirm it still matches, bump the date —
  the bump is the record that the spec was re-reviewed. CI fails the PR if module code changed and the date did not
  move.

## Feature Map maintenance rules

The map lists **every** module of both layers, grouped by product area, names only. Strict entry format (one line per
module, validated by script):

```markdown
- `module-name` ← feature awaiting a spec
- [`module-name`](./module-name/README.md) ← documented feature
- `module-name` (no spec planned) ← trivial feature, exempt
- `module-name` (aggregate) ← aggregate awaiting a spec
- [`module-name`](../aggregates/module-name/README.md) (aggregate) ← documented aggregate
- `module-name` (aggregate, no spec planned) ← trivial aggregate, exempt
```

- **New module** → add its entry to the section matching its product area (multisig features under `## Multisig`, etc.).
  Only create a new section for a genuinely new product area. Each module appears in exactly one home section.
- **Cross-cutting module** → keep one home entry; reference it from related sections with a blockquote note, never a
  duplicate entry:

  ```markdown
  > See also: [`module-name`](#section-anchor) — why it is related.
  ```

- **Spec README added** → convert the plain-name entry to a link.
- **Trivial module** (presentation-only, purely mechanical — same skip rule as above) → mark it `(no spec planned)` so
  it doesn't read as documentation debt.
- **Module deleted/renamed** → update its entry in the same change.
- There is no hand-maintained coverage counter — the validation script computes and prints coverage.

## Always finish with validation

```bash
pnpm check:feature-map
```

Fix every reported problem before finishing. The script verifies: every module listed exactly once, no stale entries,
documented modules linked, backlinks present with a `Last reviewed` date, `(no spec planned)` markers consistent with
reality.

CI (lint workflow) runs it with `--changed <PR base>`, which additionally fails the PR when a changed feature/aggregate
has no spec, or its code changed without the spec's `Last reviewed` date moving. So whenever you touch a module's code,
either review the spec and bump its date in the same change, write the missing spec, or mark a trivial module
`(no spec planned)` in the map. To reproduce the CI check locally: `pnpm check:feature-map --changed origin/dev`
(committed changes only).
