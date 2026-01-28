# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Code Quality
- `pnpm lint` - Run ESLint on source code
- `pnpm lint:fix` - Run linter and auto-fix issues
- `pnpm types` - Run TypeScript type checking (tsc)
- `pnpm types:go` - Run TypeScript type checking with tsgo (~6x faster, preferred)
- `pnpm fmt:check` - Check code formatting with Prettier
- `pnpm fmt:fix` - Auto-fix code formatting

**Note:** Prefer `pnpm types:go` for type checking - it uses tsgo (TypeScript's native Go port) and is approximately 6x faster than tsc.

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
- **Resource Management** - Data fetching abstractions in `shared/resource/`
- **Feature Flags** - Dynamic feature toggling system
- **Form Management** - Custom form utilities with validation

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