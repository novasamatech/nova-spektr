---
name: feature-specs
description: Maintain feature spec READMEs and the Feature Map index. Use when creating a new feature or aggregate, materially changing the behaviour of an existing one, writing or updating a spec README, or when asked about feature documentation coverage.
---

# Feature Specs & Feature Map Maintenance

Non-trivial features (`src/renderer/features/`) and aggregates
(`src/renderer/aggregates/`) carry a colocated `README.md` — a **product spec**
of what the code does and why (states, scenarios, lifecycle), not how it is
wired. All specs are indexed in the **Feature Map**:
`src/renderer/features/README.md`.

The canonical human-facing convention (what goes in a spec, the author-approval
workflow) is `docs/content/docs/code/style/feature-specs.md` — read it before
writing a spec. Worked example:
`src/renderer/aggregates/multisig-operation-description/README.md`.

## When a spec is required

- New feature/aggregate with user-visible behaviour or non-obvious rules → write one.
- Material behaviour change (new states, new gating, changed flow) → update the
  existing spec **in the same change**.
- Skip for trivial, presentation-only, or purely mechanical modules.
- Before changing any feature: read its README first if it exists — it is the
  source of product truth. If the code contradicts it, surface that.
- A draft spec must be approved by the feature's author before the change is
  finalized — treat the spec as a deliverable alongside the code.

## Spec README template

```markdown
# <Feature name>

> Part of the [Feature Map](<backlink>)

## Overview
What this feature is, the problem it solves, one-line behaviour summary.

## Who can use it / when it applies
Preconditions, permissions, audience.

## States / scenarios
Each visible state and the rule that triggers it (table and/or mermaid diagram).

## Lifecycle
Happy path from entry to outcome; notable failure handling.

## Related
Adjacent flows, backend contracts, constraints.
```

Backlink path: `../README.md` from `features/<name>/`,
`../../features/README.md` from `aggregates/<name>/`. The backlink line is
mandatory and sits right after the `# Title` heading. Match the depth to the
feature — a small one needs only Overview + States.

## Feature Map maintenance rules

The map lists **every** module of both layers, grouped by product area, names
only. Strict entry format (one line per module, validated by script):

```markdown
- `module-name`                                                    ← undocumented feature
- [`module-name`](./module-name/README.md)                         ← documented feature
- `module-name` (aggregate)                                        ← undocumented aggregate
- [`module-name`](../aggregates/module-name/README.md) (aggregate) ← documented aggregate
```

- **New module** → add its entry to the section matching its product area
  (multisig features under `## Multisig`, etc.). Only create a new section for a
  genuinely new product area. Each module appears in exactly one home section.
- **Cross-cutting module** → keep one home entry; reference it from related
  sections with a blockquote note, never a duplicate entry:

  ```markdown
  > See also: [`module-name`](#section-anchor) — why it is related.
  ```
- **Spec README added** → convert the plain-name entry to a link.
- **Module deleted/renamed** → update its entry in the same change.
- **Counter** — the `**Documented: N / M**` line near the top must always match
  reality (N = modules with README, M = total modules across both layers).

## Always finish with validation

```bash
node scripts/check-feature-index.mjs
```

Fix every reported problem before finishing. The script verifies: every module
listed exactly once, no stale entries, documented modules linked, backlinks
present, counter accurate.
