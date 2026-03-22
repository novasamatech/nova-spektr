# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Development
- `pnpm start` - Start Electron app in dev mode (also accessible via browser)
- `pnpm start:renderer` - Start only renderer without Electron (not recommended)
- `pnpm preview` - Start Electron in staging mode with browser access

### Build
- `pnpm build` - Build app in production mode
- `pnpm build:dev` - Build app in development mode
- `pnpm build:staging` - Build app in staging mode
- `pnpm staging:sequence` - Full staging build sequence (clean, build, postbuild, dist)
- `pnpm prod:sequence` - Full production build sequence (clean, build, postbuild, dist)

### Testing
- `pnpm test` - Run unit tests (Vitest)
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:ui` - Run tests with UI
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm test:system` - Run end-to-end tests (Playwright)
- `pnpm test tests/integrations` - Run integration tests

#### Integration Tests
Integration tests live in `tests/integrations/` and test feature model logic (Effector stores/events), storage persistence (IndexedDB), state management workflows, validation rules, and transaction building. They use a custom FeatureTestBuilder/FeatureTestEnvironment framework with fake IndexedDB and isolated Effector scopes.

**When to use**: Multi-step business logic spanning stores, events, and storage. Not for UI rendering (component tests), pure functions (unit tests), or full user flows (E2E/Playwright).

See [`tests/integrations/CLAUDE.md`](tests/integrations/CLAUDE.md) for the complete framework reference.

### Code Quality
- `pnpm lint` - Run ESLint on source code
- `pnpm lint:fix` - Run linter and auto-fix issues
- `pnpm types` - Run TypeScript type checking (tsc)
- `pnpm types:go` - Run TypeScript type checking with tsgo (~6x faster, preferred)
- `pnpm fmt:check` - Check code formatting with Prettier
- `pnpm fmt:fix` - Auto-fix code formatting


## Architecture

### Main Application Structure
- **Electron Main Process** (`src/main/`) - Controls application lifecycle, window management, and system integration
- **Electron Preload** (`src/main/preload.ts`) - Secure bridge between main and renderer processes
- **Renderer Process** (`src/renderer/`) - React-based UI application

### Frontend Architecture (Feature-Sliced Design)
The renderer follows a modified Feature-Sliced Design methodology:

- **`app/`** - Application initialization, routing, and global providers
- **`pages/`** - Route-level components (Assets, Governance, Staking, etc.)
- **`widgets/`** - UI components that access data via hooks (useUnit, useStoreMap, etc.), not whole features — just hook-consuming UI
- **`features/`** - Business logic units (wallet management, transactions, governance)
- **`sdk/`** - Simple way to integrate features and domains
- **`entities/`** - **DEPRECATED.** Never create new modules here. When touching existing entity code, migrate: models/services → `domains/`, hook-consuming UI → `widgets/`
- **`shared/`** - Reusable code across layers

### Key Architectural Patterns
- **Effector** - State management with stores, events, and effects
- **Dependency Injection** - Custom DI system in `shared/di/`
  - **Slots**: Page creates `createSlot<Props>({ name })`, renders `<Slot id={slot} props={...} />`. Features inject via `feature.inject(slot, { order, render: Component })`.
  - **Pipelines**: Data transformation chains (`createPipeline<Value>`). Features inject via `feature.inject(pipeline, (value) => transform(value))`.
- **Feature file layout**: `ui/` contains React components only. Hooks (custom React hooks) live in a dedicated `hooks/` subfolder within the feature, not in `ui/`. Shared chart/visual constants belong in `shared/ui/chart-constants.ts`.
- **Resource Management** - Data fetching abstractions in `shared/resource/`
- **Query Resources** - Standard data-fetching pattern using `createQueryResource` + `useResource` from `shared/query/`. Reference implementations: `domains/governance/tracks/resource.ts` and `hooks.ts`. Prefer this over hand-rolled Effector effects with manual cache stores.
- **Feature Flags** - Dynamic feature toggling system
- **Form Management** - Custom form utilities with validation

### Balance Subscription System
- `balanceSubModel.fetchAccounts` (`features/assets-balances`) accepts `AnyAccount[]` — wallet account objects only. It uses `accountService.isAccountAvailableOnChain` to filter chains per account.
- For contacts or arbitrary addresses, use `balanceSubModel.fetchAccountIds` (low-level) with `RequestedAccount[]` (`{ accountId: AccountId, chain: Chain }`) — you must pair with all chains yourself since there's no chain-availability check for non-wallet addresses.
- `AccountId` is a branded type from `@/shared/polkadotjs-schemas`, not `@/shared/core`. Use source objects with proper types (e.g., `Contact.accountId`) rather than casting strings.

### Staking System
- **Staking lives on Asset Hub**, not relay chains. `DEFAULT_STAKING_CHAIN` is Polkadot Asset Hub (`AssetHubChains['POLKADOT_AH']`). Kusama staking is on Kusama Asset Hub.
- `shared/resource/createSubscriptionResource` is **legacy** (single subscription). Use `shared/query/createSubscriptionResource` (pooled, ref-counted) for new code. Reference: `domains/governance/voting/resource.ts`.

### Local Storage / State Persistence
- **`localStorageService` is deprecated** — use `persist` from `effector-storage/local` instead.
- Pattern: initialize store with default value, call `persist({ key, store, sync: true })`. No manual `init` event needed — `persist` auto-hydrates at module load.
- Reference: `aggregates/staking-network/model.ts`, `shared/config/features/index.ts`

### Domain Structure
- **`domains/`** - Pure business logic: Effector models, services, types, constants, resources. No `effector-react` imports allowed.
  - **`domains/network/`** - Blockchain network interactions (accounts, transactions, multisig operations)
  - **`domains/collectives/`** - Polkadot Fellowship and governance-related logic
  - **Naming**: Service exports must be named `somethingService` (e.g. `stakingService`), not `somethingUtils`.
- **`aggregates/`** - User-preference stores and orchestration logic that combine multiple domains. Domains stay pure for data-fetching; if a model needs a user preference or cross-domain combine, it belongs in an aggregate.

### Key Technologies
- **React 19** with TypeScript and SWC compilation
- **Polkadot.js API** and **Polkadot-API (PAPI)** for blockchain interactions
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Vitest** for unit testing, **Playwright** for e2e testing
- **Vite** for build tooling

### Environment Configuration
- **Development**: Uses test chains (`chains_dev.json`), debug tools enabled
- **Staging**: Uses production chains (`chains.json`), debug tools enabled, smooth error handling
- **Production**: Uses production chains, debug tools disabled, smooth error handling

### Localization
- All UI text must be localized using `react-i18next`
- Localization files in `/src/shared/i18n/locales/`
- Use ESLint ignore comments for non-translatable strings:
  ```tsx
  {/* eslint-disable-next-line i18next/no-literal-string */}
  ```

### Code Style Requirements
- **Import boundaries**: Features must import from domain barrel files (`@/domains/network`), never deep paths (`@/domains/network/price-history/resource`). The `boundaries/entry-point` lint rule enforces this.
- **Inline type imports**: Use `import { type Foo } from '...'` (inline specifier), not `import type { Foo } from '...'` (top-level). Enforced by `import-x/consistent-type-specifier-style`.
- **Avoid `as` type casts** - Use typeguards with actual runtime checks instead. Prefer `satisfies` for type validation without casting. Type casts hide potential bugs; typeguards catch them.
- **No `React.` namespace** - Never use `React.memo()`, `React.ComponentProps`, etc. Always destructure from `'react'` directly: `import { memo, type ComponentProps } from 'react'`.
- **Branded types (`Address`, `AccountId`)**: `Address` (`@/shared/core`) and `AccountId` (`@/shared/polkadotjs-schemas`) are different branded string types. Use `toAddress(str)` from `@/shared/lib/utils` to convert plain strings to `Address` at call sites (e.g., for `<Identicon>`). Don't change data layer types just to satisfy a UI component's branded type.

### UI/Chart Patterns
- **Recharts single-segment pie**: Guard with `data.length === 0` not `data.length < 2`. Recharts renders a single pie segment as a valid full donut ring — `< 2` hides a legitimate "100% in one chain" state.

### UI Animation Patterns
- **Smooth fold/collapse animations**: Never use conditional DOM branches (`if (folded) return <A>; return <B>`) for animated transitions. Keep identical DOM structure in both states; only change CSS classes (e.g. `max-w-0 opacity-0` ↔ `max-w-[180px] opacity-100`). DOM swaps cause instant jumps that CSS transitions can't smooth over.
- **Radix UI `asChild` + React Router `NavLink`**: Never put `NavLink` directly inside Radix `Trigger` components (Tooltip.Trigger, etc.) — Radix's `asChild` stringifies NavLink's function `className`. Always wrap NavLink in a `<div>` first.
- **Radix Tooltip conditional control**: To show tooltip only in certain states, use `open={condition ? undefined : false}` instead of conditionally rendering the Tooltip wrapper.

### DI System Quirks
- **HMR doesn't work for Slot-injected components** — Components rendered via `<Slot>` require full page reload to pick up changes. Debug via browser console dynamic imports: `import('/@fs/...path...').then(m => m.store.$cache.getState())`.
- **One slot registration per feature** — The DI system keys registrations as `feature: ${name}`. Calling `feature.inject(slot, ...)` twice on the same feature instance replaces the first registration — only the last component renders. Use two separate `createFeature()` instances with distinct names to inject two components into the same slot.
- **Never `memo()` slot-injected components** — The slot render system calls `slotHandlerBody.render(props)` directly as a function. `React.memo()` returns an exotic object, not a callable function, causing `TypeError: slotHandlerBody.render is not a function`. Only wrap with `memo()` components used as JSX (`<Comp />`), not those passed as `render:` in `feature.inject(slot, { render: Comp })`.
