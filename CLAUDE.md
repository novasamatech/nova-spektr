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

**Note:** Prefer `pnpm types:go` for type checking - it uses tsgo (TypeScript's native Go port) and is approximately 6x faster than tsc.

**Known issue:** `vite.config.renderer.ts:34` has a persistent `TS2578` (unused `@ts-expect-error`). This is pre-existing — don't treat as a regression from your changes.

### Single Test Execution
To run a single test file:
```bash
pnpm test path/to/test-file.test.ts
```

## Architecture

### Main Application Structure
- **Electron Main Process** (`src/main/`) - Controls application lifecycle, window management, and system integration
- **Electron Preload** (`src/main/preload.ts`) - Secure bridge between main and renderer processes
- **Renderer Process** (`src/renderer/`) - React-based UI application

### Frontend Architecture (Feature-Sliced Design)
The renderer follows Feature-Sliced Design methodology:

- **`app/`** - Application initialization, routing, and global providers
- **`pages/`** - Route-level components (Assets, Governance, Staking, etc.)
- **`widgets/`** - Complex UI blocks combining multiple features
- **`features/`** - Business logic units (wallet management, transactions, governance)
- **`entities/`** - Business entities (wallet, chain, balance, governance, etc.)
- **`shared/`** - Reusable code across layers

### Key Architectural Patterns
- **Effector** - State management with stores, events, and effects
- **Dependency Injection** - Custom DI system in `shared/di/`
  - **Slots**: Page creates `createSlot<Props>({ name })`, renders `<Slot id={slot} props={...} />`. Features inject via `feature.inject(slot, { order, render: Component })`.
  - **Pipelines**: Data transformation chains (`createPipeline<Value>`). Features inject via `feature.inject(pipeline, (value) => transform(value))`.
- **Resource Management** - Data fetching abstractions in `shared/resource/`
- **Feature Flags** - Dynamic feature toggling system
- **Form Management** - Custom form utilities with validation

### Balance Subscription System
- `balanceSubModel.fetchAccounts` (`features/assets-balances`) accepts `AnyAccount[]` — wallet account objects only. It uses `accountService.isAccountAvailableOnChain` to filter chains per account.
- For contacts or arbitrary addresses, use `balanceSubModel.fetchAccountIds` (low-level) with `RequestedAccount[]` (`{ accountId: AccountId, chain: Chain }`) — you must pair with all chains yourself since there's no chain-availability check for non-wallet addresses.
- `AccountId` is a branded type from `@/shared/polkadotjs-schemas`, not `@/shared/core`. Use source objects with proper types (e.g., `Contact.accountId`) rather than casting strings.

### Domain Structure
- **`domains/network/`** - Blockchain network interactions (accounts, transactions, multisig operations)
- **`domains/collectives/`** - Polkadot Fellowship and governance-related logic
- **`aggregates/`** - Complex business operations spanning multiple entities

### Key Technologies
- **React 19** with TypeScript and SWC compilation
- **Polkadot.js API** and **Polkadot-API (PAPI)** for blockchain interactions
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Vitest** for unit testing, **Playwright** for e2e testing
- **Vite** for build tooling

### Testing
- Unit tests use **Vitest** with custom sequencing by architectural layers
- E2e tests use **Playwright** with custom page objects in `tests/system/`
- Test files should be co-located with source files using `.test.ts` suffix

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
- Follow existing TypeScript and React patterns
- Use Effector for state management (stores, events, effects)
- Implement proper error boundaries and loading states
- Use the custom DI system for dependency injection
- Follow Feature-Sliced Design import rules (no upward imports between layers)
- Use absolute imports via TypeScript path mapping
- Prioritize code correctness and clarity. Speed and efficiency are secondary priorities unless otherwise specified.
- Do not write organizational or comments that summarize the code. Comments should only be written in order to explain "why" the code is written in some way in the case there is a reason that is tricky / non-obvious.
- **Avoid `as` type casts** - Use typeguards with actual runtime checks instead. Prefer `satisfies` for type validation without casting. Type casts hide potential bugs; typeguards catch them.

### UI Animation Patterns
- **Smooth fold/collapse animations**: Never use conditional DOM branches (`if (folded) return <A>; return <B>`) for animated transitions. Keep identical DOM structure in both states; only change CSS classes (e.g. `max-w-0 opacity-0` ↔ `max-w-[180px] opacity-100`). DOM swaps cause instant jumps that CSS transitions can't smooth over.
- **Radix UI `asChild` + React Router `NavLink`**: Never put `NavLink` directly inside Radix `Trigger` components (Tooltip.Trigger, etc.) — Radix's `asChild` stringifies NavLink's function `className`. Always wrap NavLink in a `<div>` first.
- **Radix Tooltip conditional control**: To show tooltip only in certain states, use `open={condition ? undefined : false}` instead of conditionally rendering the Tooltip wrapper.
