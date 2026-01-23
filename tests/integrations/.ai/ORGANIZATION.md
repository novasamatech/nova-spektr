# Integration Tests Organization Guide

This document describes the feature-based organization of the integration testing framework.

## Philosophy

The integration tests follow **feature-based organization** with **separation of concerns**:

- **Fixtures** - Organized by domain entity (wallet, account, balance, etc.)
- **Utils** - Organized by functionality (framework, network, XCM, etc.)
- **Tests** - Organized by feature being tested

This structure provides:
- ✅ Clear separation between different concerns
- ✅ Easy discoverability (find fixtures/utils by what they represent)
- ✅ Scalability (add new features without cluttering existing structure)
- ✅ Maintainability (related code stays together)

---

## Directory Structure

```
tests/integrations/
├── .ai/                           # AI context and documentation
│   ├── CONTEXT.md                # Complete AI testing guide
│   ├── MIGRATION.md              # Documentation migration history
│   └── ORGANIZATION.md           # This file
│
├── fixtures/                      # Test data organized by domain
│   ├── index.ts                  # Re-exports all fixtures
│   ├── wallet/                   # Wallet fixtures
│   │   ├── index.ts
│   │   └── wallets.ts            # vaultWallet, multisigWallet, etc.
│   ├── account/                  # Account fixtures
│   │   ├── index.ts
│   │   └── accounts.ts           # senderAccount, recipientAccount, etc.
│   ├── balance/                  # Balance fixtures
│   │   ├── index.ts
│   │   └── balances.ts           # senderBalance, createBalance(), etc.
│   ├── chain/                    # Chain fixtures
│   │   ├── index.ts
│   │   └── chains.ts             # polkadotChain, kusamaChain, etc.
│   └── transaction/              # Transaction templates
│       ├── index.ts
│       └── transactions.ts       # nativeTransferTx, xcmTransferTx, etc.
│
├── utils/                         # Testing utilities by function
│   ├── index.ts                  # Re-exports all utilities
│   ├── framework/                # Core testing framework ⭐
│   │   ├── index.ts
│   │   ├── FeatureTestBuilder.ts
│   │   ├── FeatureTestEnvironment.ts
│   │   ├── TestStorageBuilder.ts
│   │   └── scenarios.ts          # createTransferScenario(), etc.
│   ├── builders/                 # Data builders
│   │   ├── index.ts
│   │   └── mockDataBuilder.ts    # MockDataBuilder class
│   ├── network/                  # Network utilities
│   │   ├── index.ts
│   │   ├── createWsConnection.ts
│   │   ├── fetchPolyfill.ts
│   │   └── getTestAccounts.ts
│   ├── xcm/                      # XCM-specific tools
│   │   ├── index.ts
│   │   └── xcmDestinationsCollector.ts
│   ├── chain/                    # Chain utilities
│   │   ├── index.ts
│   │   └── prepareChainsData.ts
│   └── common/                   # Shared constants
│       └── constants.ts
│
├── tests/                         # Test files
│   ├── transfer-form-logic.integration.test.ts
│   ├── transfer-max-ed.integration.test.ts
│   └── xcm-destinations.integration.test.ts
│
└── README.md                      # Developer guide
```

---

## Fixtures Organization

### Principle: Organize by Domain Entity

Each domain entity has its own folder with:
- `index.ts` - Re-exports and documentation
- `{entity}.ts` - Actual fixture data

### Example: Adding Balance Fixtures

```typescript
// fixtures/balance/balances.ts
export const newBalance: Balance = {
  id: `${account.accountId}-${chainId}-${assetId}`,
  accountId: account.accountId,
  chainId,
  assetId,
  total: '1000000000000',
  frozen: '0',
  reserved: '0',
  transferable: 'legacy',
};
```

### Import Pattern

```typescript
// ✅ GOOD: Import from fixtures root
import { senderBalance, vaultWallet, polkadotChain } from '@tests/integrations/fixtures';

// ❌ BAD: Direct imports from subdirectories
import { senderBalance } from '@tests/integrations/fixtures/balance/balances';
```

**Why?** The root `fixtures/index.ts` re-exports everything, providing a clean API.

---

## Utils Organization

### Principle: Organize by Functionality

Utils are grouped by what they do, not what they work with:

- `framework/` - Core testing tools (most important)
- `builders/` - Dynamic data generation
- `network/` - Network operations
- `xcm/` - XCM-specific logic
- `chain/` - Chain data preparation
- `common/` - Shared constants

### Framework Utils (Most Important)

The `framework/` folder contains the core testing API:

```typescript
import {
  FeatureTestBuilder,        // Fluent setup API
  FeatureTestEnvironment,     // Test execution API
  TestStorageBuilder,         // Storage management
  createTransferScenario,     // Pre-configured scenarios
} from '@tests/integrations/utils';
```

### Example: Adding a Scenario Helper

```typescript
// utils/framework/scenarios.ts
export async function createStakingScenario(): Promise<FeatureTestEnvironment> {
  return new FeatureTestBuilder()
    .withWallet(vaultWallet)
    .withAccount(validatorAccount)
    .withBalance(stakingBalance)
    .withChain(polkadotChain)
    .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
    .build();
}
```

Then update `utils/framework/index.ts`:
```typescript
export * from './scenarios';  // Already exported
```

### Import Pattern

```typescript
// ✅ GOOD: Import from utils root
import { FeatureTestBuilder, createTransferScenario } from '@tests/integrations/utils';

// ❌ BAD: Direct imports from subdirectories
import { FeatureTestBuilder } from '@tests/integrations/utils/framework/FeatureTestBuilder';
```

---

## Adding New Features

### 1. Adding a New Fixture Type

Example: Adding governance fixtures

```bash
# Create directory
mkdir tests/integrations/fixtures/governance

# Create files
touch tests/integrations/fixtures/governance/index.ts
touch tests/integrations/fixtures/governance/proposals.ts
```

```typescript
// fixtures/governance/proposals.ts
export const democracyProposal = {
  id: 'prop-1',
  type: 'democracy',
  // ... proposal data
};

// fixtures/governance/index.ts
/**
 * Governance test fixtures
 *
 * Includes:
 * - Democracy proposals
 * - Council motions
 * - Treasury proposals
 */
export * from './proposals';

// fixtures/index.ts (add to existing exports)
export * from './governance';
```

### 2. Adding a New Utility Category

Example: Adding staking utilities

```bash
# Create directory
mkdir tests/integrations/utils/staking

# Create files
touch tests/integrations/utils/staking/index.ts
touch tests/integrations/utils/staking/nominationPoolHelpers.ts
```

```typescript
// utils/staking/nominationPoolHelpers.ts
export function calculatePoolRewards(...) {
  // Helper implementation
}

// utils/staking/index.ts
/**
 * Staking utilities
 *
 * Tools for testing staking functionality
 */
export * from './nominationPoolHelpers';

// utils/index.ts (add to existing exports)
export * from './staking';
```

### 3. Adding a New Scenario

```typescript
// utils/framework/scenarios.ts
export async function createGovernanceScenario(): Promise<FeatureTestEnvironment> {
  return new FeatureTestBuilder()
    .withWallet(vaultWallet)
    .withAccount(councilMember)
    .withChain(polkadotChain)
    .build();
}
```

No need to update index files - already exported via `export * from './scenarios'`.

---

## Best Practices

### ✅ DO:

1. **Group related fixtures together**
   ```
   fixtures/wallet/
   ├── wallets.ts          # All wallet fixtures
   └── index.ts
   ```

2. **Use descriptive exports**
   ```typescript
   // Good
   export const vaultWallet: Wallet = { ... };
   export const senderBalance: Balance = { ... };

   // Bad
   export const wallet1 = { ... };
   export const bal = { ... };
   ```

3. **Provide helpers in fixture files**
   ```typescript
   // fixtures/balance/balances.ts
   export function createBalance(
     accountId: string,
     chainId: string,
     total: string
   ): Balance {
     return { /* ... */ };
   }
   ```

4. **Document in index.ts**
   ```typescript
   /**
    * Balance test fixtures
    *
    * Includes:
    * - Standard balances
    * - Low balances
    * - Helper functions
    */
   export * from './balances';
   ```

5. **Use barrel exports** (index.ts files)
   - Provides clean import paths
   - Allows internal reorganization without breaking imports

### ❌ DON'T:

1. **Mix concerns**
   ```
   ❌ fixtures/wallet-and-account/
   ✅ fixtures/wallet/ + fixtures/account/
   ```

2. **Skip index files**
   - Always create `index.ts` for re-exports
   - Keeps imports clean and consistent

3. **Hardcode test data in tests**
   ```typescript
   // ❌ BAD
   const wallet = { id: 1, name: 'Test', ... };

   // ✅ GOOD
   import { vaultWallet } from '@tests/integrations/fixtures';
   ```

4. **Create deeply nested structures**
   ```
   ❌ fixtures/transfer/native/polkadot/sender/
   ✅ fixtures/account/
   ```

5. **Duplicate fixtures**
   - Reuse existing fixtures
   - Create variants only when needed

---

## Migration from Old Structure

The previous structure had a single large `transfer-fixtures.ts` (412 lines) which has been split into feature-based folders:

### Before (Single File)
```
fixtures/
├── index.ts
└── transfer-fixtures.ts    # 412 lines, everything mixed
```

### After (Feature-Based)
```
fixtures/
├── index.ts               # Clean re-exports
├── wallet/
│   └── wallets.ts        # 40 lines
├── account/
│   └── accounts.ts       # 100 lines
├── balance/
│   └── balances.ts       # 120 lines
├── chain/
│   └── chains.ts         # 130 lines
└── transaction/
    └── transactions.ts   # 90 lines
```

**Benefits:**
- Clear separation of concerns
- Easier to find specific fixtures
- Better for code navigation
- Scalable for new features

---

## Quick Reference

### Import Patterns

```typescript
// Fixtures
import {
  vaultWallet,           // from fixtures/wallet/
  senderAccount,         // from fixtures/account/
  senderBalance,         // from fixtures/balance/
  polkadotChain,        // from fixtures/chain/
  nativeTransferTx,     // from fixtures/transaction/
} from '@tests/integrations/fixtures';

// Framework (core)
import {
  FeatureTestBuilder,
  FeatureTestEnvironment,
  createTransferScenario,
} from '@tests/integrations/utils';

// Specialized utils
import {
  MockDataBuilder,              // from utils/builders/
  createWsConnection,           // from utils/network/
  collectXcmDestinations,       // from utils/xcm/
  prepareTestData,              // from utils/chain/
} from '@tests/integrations/utils';
```

### File Naming Conventions

- `{domain}.ts` - Actual data/code (e.g., `wallets.ts`, `balances.ts`)
- `index.ts` - Re-exports with documentation
- `{feature}.integration.test.ts` - Test files

---

## Principles Summary

1. **Feature-Based Organization** - Group by domain/function, not by file type
2. **Separation of Concerns** - Fixtures vs Utils vs Tests
3. **Barrel Exports** - Use index.ts for clean import paths
4. **Documentation** - Every index.ts explains its contents
5. **Scalability** - Easy to add new features without restructuring

---

**For detailed testing guide, see:** [`.ai/CONTEXT.md`](./CONTEXT.md)
**For developer guide, see:** [`../README.md`](../README.md)
