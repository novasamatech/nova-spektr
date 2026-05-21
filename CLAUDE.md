# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Reference Documentation

Project documentation:

- @docs/content/docs/onboarding/getting-started.mdx
- @docs/content/docs/onboarding/project-structure.mdx
- @docs/content/docs/onboarding/links.mdx
- @docs/content/docs/code/style/naming.md
- @docs/content/docs/code/style/effector.md

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update 'tasks/lessons.md' with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -> then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management
1. Plan First: Write plan to 'tasks/todo.md' with checkable items
2. Verify Plan: Check in before starting implementation
3. Track Progress: Mark items complete as you go
4. Explain Changes: High-level summary at each step
5. Document Results: Add review to 'tasks/todo.md'
6. Capture Lessons: Update 'tasks/lessons.md' after corrections

## Core Principles
- Simplicity First: Make every change as simple as possible. Impact minimal code.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Changes should only touch what's necessary. Avoid introducing bugs.

## Project Overview

Nova Spektr is a Polkadot & Kusama ecosystem Enterprise Desktop application built with Electron, React, and TypeScript. It's a multi-wallet application supporting hardware wallets (Polkadot Vault), multisig accounts, staking, and cross-chain transfers.

## Development Commands

For the full pnpm script reference see `@docs/content/docs/onboarding/getting-started.mdx`.
Project-specific notes:
- Prefer `pnpm types:go` over `pnpm types` (~6× faster).
- `pnpm test:integration` runs the integration suite under `tests/integrations/` — see [`tests/integrations/CLAUDE.md`](tests/integrations/CLAUDE.md). Use it for multi-step business logic spanning stores/events/storage; not for UI rendering, pure functions, or full user flows.

## Architecture

For the FSD layer overview and domain/aggregate/feature folder structures see `@docs/content/docs/onboarding/project-structure.mdx`.

### Main Application Structure
- **Electron Main Process** (`src/main/`) - Application lifecycle, window management, system integration.
- **Electron Preload** (`src/main/preload.ts`) - Bridge between main and renderer.
- **Renderer Process** (`src/renderer/`) - React UI.

### Layer rules not in the docs
- **`entities/`** is **DEPRECATED.** Never create new modules here. When touching existing entity code, migrate: models/services → `domains/`, hook-consuming UI → `widgets/`.
- **`domains/`** must not import `effector-react`. Domains stay pure (Effector models, services, types, constants, resources).
- **`aggregates/`** hold user-preference stores and orchestration logic that combine multiple domains. If a model needs a user preference or cross-domain combine, it belongs here, not in a domain.

### Key Architectural Patterns
- **Dependency Injection** — Custom DI in `shared/di/`.
  - **Slots**: Page creates `createSlot<Props>({ name })`, renders `<Slot id={slot} props={...} />`. Features inject via `feature.inject(slot, { order, render: Component })`.
  - **Pipelines**: Data transformation chains (`createPipeline<Value>`). Features inject via `feature.inject(pipeline, (value) => transform(value))`.
- **Query Resources** — Standard data-fetching pattern: `createQueryResource` + `useResource` from `shared/query/`. Prefer over hand-rolled Effector effects with manual cache stores. Reference: `domains/governance/tracks/resource.ts` + `hooks.ts`.
- **Resource Management** — Data fetching abstractions in `shared/resource/`.
- Shared chart/visual constants belong in `shared/ui/chart-constants.ts`.

### Balance Subscription System
- `balanceSubModel.fetchAccounts` (`features/assets-balances`) accepts `AnyAccount[]` — wallet account objects only. Uses `accountService.isAccountAvailableOnChain` to filter chains per account.
- For contacts or arbitrary addresses, use `balanceSubModel.fetchAccountIds` (low-level) with `RequestedAccount[]` (`{ accountId: AccountId, chain: Chain }`) — pair with all chains yourself; there's no chain-availability check for non-wallet addresses.
- For `AccountId` brand origin and conversion rules see "Code Style Requirements" below.

### Staking System
- **Staking lives on Asset Hub**, not relay chains. `DEFAULT_STAKING_CHAIN` is Polkadot Asset Hub (`AssetHubChains['POLKADOT_AH']`). Kusama staking is on Kusama Asset Hub.
- `shared/resource/createSubscriptionResource` is **legacy** (single subscription). Use `shared/query/createSubscriptionResource` (pooled, ref-counted) for new code. Reference: `domains/governance/voting/resource.ts`.

### Local Storage / State Persistence
- **`localStorageService` is deprecated** — use `persist` from `effector-storage/local`.
- Pattern: initialize store with default value, call `persist({ key, store, sync: true })`. No manual `init` event needed — `persist` auto-hydrates at module load.
- Reference: `aggregates/staking-network/model.ts`, `shared/config/features/index.ts`.

### Key Technologies
- **React 19** + TypeScript (SWC), **Polkadot.js API** + **Polkadot-API (PAPI)**, **Tailwind CSS**, **Radix UI**, **Vitest** (unit), **Playwright** (e2e), **Vite**.

### Environment Configuration
- **Development**: test chains (`chains_dev.json`), debug tools enabled.
- **Staging**: production chains (`chains.json`), debug tools enabled, smooth error handling.
- **Production**: production chains, debug tools disabled, smooth error handling.

### Localization
- All UI text must be localized using `react-i18next`. Files in `/src/shared/i18n/locales/`.
- Use ESLint ignore comments for non-translatable strings:
  ```tsx
  {/* eslint-disable-next-line i18next/no-literal-string */}
  ```

### Code Style Requirements
- **Import boundaries**: Features must import from domain barrel files (`@/domains/network`), never deep paths (`@/domains/network/price-history/resource`). Enforced by `boundaries/entry-point`.
- **Inline type imports**: `import { type Foo } from '...'`, not `import type { Foo } from '...'`. Enforced by `import-x/consistent-type-specifier-style`.
- **Avoid `as` type casts** — use typeguards with runtime checks; prefer `satisfies` for validation without casting.
- **No `React.` namespace** — destructure from `'react'`: `import { memo, type ComponentProps } from 'react'`. Never `React.memo()`, `React.ComponentProps`, etc.
- **Branded types `Address` / `AccountId`** — different brands. `Address` lives in `@/shared/core`; `AccountId` in `@/shared/polkadotjs-schemas`. Use `toAddress(str)` from `@/shared/lib/utils` to convert plain strings to `Address` at call sites (e.g. for `<Identicon>`). Don't change data-layer types just to satisfy a UI component's branded type. Use source objects with proper types (e.g. `Contact.accountId`) rather than casting strings.

### UI/Chart Patterns
- **Recharts single-segment pie**: Guard with `data.length === 0`, not `data.length < 2`. Recharts renders a single pie segment as a valid full donut ring — `< 2` hides a legitimate "100% in one chain" state.

### UI Animation Patterns
- **Smooth fold/collapse animations**: Never use conditional DOM branches (`if (folded) return <A>; return <B>`) for animated transitions. Keep identical DOM structure; only change CSS classes (e.g. `max-w-0 opacity-0` ↔ `max-w-[180px] opacity-100`). DOM swaps cause instant jumps that CSS transitions can't smooth over.
- **Radix `asChild` + React Router `NavLink`**: Never put `NavLink` directly inside Radix `Trigger` components — Radix's `asChild` stringifies NavLink's function `className`. Wrap `NavLink` in a `<div>` first.
- **Radix Tooltip conditional control**: To show tooltip only in certain states, use `open={condition ? undefined : false}` instead of conditionally rendering the Tooltip wrapper.

### DI System Quirks
- **HMR doesn't work for Slot-injected components** — components rendered via `<Slot>` require full page reload to pick up changes. Debug via browser console dynamic imports: `import('/@fs/...path...').then(m => m.store.$cache.getState())`.
- **One slot registration per feature** — DI keys registrations as `feature: ${name}`. Calling `feature.inject(slot, ...)` twice on the same feature replaces the first registration — only the last component renders. Use two separate `createFeature()` instances with distinct names to inject two components into the same slot.
- **Never `memo()` / `lazy()` / `forwardRef()` slot-injected components** — the slot render system calls `slotHandlerBody.render(props)` directly as a function. React exotics (`memo`, `lazy`, `forwardRef`) return special objects, not callable functions, causing `TypeError: slotHandlerBody.render is not a function`. If you need lazy loading for an injected component, wrap it in a plain function that internally uses `<Suspense>` + `lazy()` and inject the plain wrapper: `feature.inject(slot, MyLazyWrapper)`. The same rule applies to `memo()` — only wrap components used as JSX (`<Comp />`), not those passed to `feature.inject(slot, ...)`.

### Cross-feature load-time cycles
- **Heavy UI in a barrel that form-models import is a cycle trap.** Any `index.ts` exporting both a lib-helper consumed by form-models (e.g. `createDraftModeBinding`) and a heavy UI component whose transitive chain re-enters the same barrel will leave the helper observable as `undefined` during init. Symptoms: `TypeError: someFactory is not a function` at module-init time, often surfaced first by a test file. Fix by routing the heavy component through a Suspense wrapper that `lazy()`-loads it (`features/drafts/components/DraftsSectionLazy.tsx` is a reference) — keeps the heavy import edge off the barrel's eager graph.
