# Integration Testing - Quick Start Guide

This guide will get you writing integration tests in 5 minutes.

## Installation

No installation needed! All utilities are already set up in the project with:
- `fake-indexeddb` - Already configured in `vitest.setup.js`
- Test utilities in `tests/utils/`
- Fixtures in `tests/fixtures/`

## Your First Test

### Step 1: Import utilities

```typescript
import { FeatureTestBuilder } from '@tests/utils';
import { vaultWallet, senderAccount, senderBalance } from '@tests/fixtures';
```

### Step 2: Create a test environment

```typescript
describe('My Feature Tests', () => {
  let env;

  beforeEach(async () => {
    env = await new FeatureTestBuilder()
      .withWallet(vaultWallet)
      .withAccount(senderAccount)
      .withBalance(senderBalance)
      .build();
  });

  afterEach(async () => {
    await env.cleanup(); // Always cleanup!
  });
});
```

### Step 3: Write your test

```typescript
it('should transfer tokens', async () => {
  // Start feature
  await env.startFeature(transferFeature);

  // Execute action
  await env.executeEvent(transferFeature.events.transfer, {
    to: recipientId,
    amount: '1000000000000',
  });

  // Verify state
  expect(env.getState(transferFeature.$status)).toBe('completed');

  // Verify storage
  const txs = await env.getStorageData('basketTransactions');
  expect(txs).toHaveLength(1);
});
```

## Common Patterns

### Testing with Multiple Accounts

```typescript
const env = await new FeatureTestBuilder()
  .withWallet(vaultWallet)
  .withAccounts([senderAccount, recipientAccount, signatoryAccount])
  .withBalances([senderBalance, signatoryBalance])
  .build();
```

### Testing Cross-Chain

```typescript
const env = await new FeatureTestBuilder()
  .withWallet(vaultWallet)
  .withAccount(senderAccount)
  .withBalance(senderBalance)
  .withChain(polkadotChain)
  .withChain(assetHubChain)
  .build();
```

### Testing Multisig

```typescript
const env = await new FeatureTestBuilder()
  .withWallet(multisigWallet)
  .withAccount(multisigAccount)
  .withAccounts([signatory1, signatory2, signatory3])
  .withBalances([multisigBalance, signatory1Balance])
  .build();
```

### Waiting for Async Updates

```typescript
await env.executeEvent(feature.events.doSomething, params);

// Wait for specific state
await env.waitForState(
  feature.$status, 
  status => status === 'completed',
  5000 // timeout in ms
);
```

## Example: Complete Transfer Test

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeatureTestBuilder } from '@tests/integrations/utils';
import { 
  vaultWallet, 
  senderAccount, 
  recipientAccount,
  senderBalance,
  polkadotChain 
} from '@tests/integrations/fixtures';

describe('Transfer Feature', () => {
  let env;

  beforeEach(async () => {
    env = await new FeatureTestBuilder()
      .withWallet(vaultWallet)
      .withAccounts([senderAccount, recipientAccount])
      .withBalance(senderBalance)
      .withChain(polkadotChain)
      .build();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it('should transfer DOT successfully', async () => {
    // Verify initial balance
    const initialBalances = await env.getStorageData('balances2');
    expect(initialBalances[0].total).toBe('10000000000000');

    // Create transfer
    const transferAmount = '1000000000000'; // 100 DOT
    
    // In real test, would execute transfer through feature
    // This is simplified for demonstration
    const tx = {
      chainId: polkadotChain.chainId,
      accountId: senderAccount.accountId,
      type: 'transfer',
      args: {
        dest: recipientAccount.accountId,
        value: transferAmount,
      },
    };

    expect(tx.args.value).toBe(transferAmount);
  });

  it('should validate insufficient balance', async () => {
    const balance = await env.getStorageData('balances2');
    const available = new BN(balance[0].total);
    const tooMuch = new BN('100000000000000'); // More than available

    expect(available.lt(tooMuch)).toBe(true);
  });
});
```

## Running Tests

```bash
# Run all integration tests
pnpm test

# Run specific test file
pnpm test tests/features/transfers/transfer-feature.integration.test.ts

# Run tests in watch mode
pnpm test:watch

# Run with UI
pnpm test:ui

# Run with coverage
pnpm test:coverage
```

## Test File Structure

```
tests/integrations/
├── docs/
│   ├── INTEGRATION_TESTING_GUIDE.md  ← Full documentation
│   └── QUICK_START.md                 ← This file
├── fixtures/
│   ├── index.ts                       ← Export all fixtures
│   └── transfer-fixtures.ts           ← Transfer test data
├── utils/
│   ├── index.ts                       ← Export all utilities
│   ├── TestStorageBuilder.ts          ← Storage management
│   ├── FeatureTestEnvironment.ts      ← Test environment API
│   └── FeatureTestBuilder.ts          ← Builder for setup
└── tests/
    └── transfer-feature.integration.test.ts  ← Tests
```

## Next Steps

1. ✅ Read this quick start
2. 📖 Read the [full Integration Testing Guide](./INTEGRATION_TESTING_GUIDE.md)
3. 📝 Look at example tests in `tests/features/transfers/`
4. 🚀 Write your own integration tests!

## Common Mistakes to Avoid

### ❌ Forgetting to cleanup
```typescript
it('test', async () => {
  const env = await new FeatureTestBuilder().build();
  // ... test code
  // Missing: await env.cleanup();
});
```

### ✅ Always cleanup
```typescript
afterEach(async () => {
  await env.cleanup();
});
```

### ❌ Not waiting for async operations
```typescript
env.executeEvent(feature.events.doSomething, params); // Missing await!
expect(env.getState(feature.$result)).toBeDefined(); // Might fail
```

### ✅ Wait for async operations
```typescript
await env.executeEvent(feature.events.doSomething, params);
expect(env.getState(feature.$result)).toBeDefined();
```

### ❌ Reusing mutable objects
```typescript
const sharedWallet = { id: 1, name: 'Test' };

it('test 1', async () => {
  sharedWallet.name = 'Changed'; // Affects other tests!
});
```

### ✅ Fresh data per test
```typescript
beforeEach(async () => {
  const wallet = { id: 1, name: 'Test' }; // New object each time
  env = await new FeatureTestBuilder()
    .withWallet(wallet)
    .build();
});
```

## Getting Help

- 📖 Full docs: `tests/integrations/docs/INTEGRATION_TESTING_GUIDE.md`
- 💡 Examples: `tests/integrations/tests/`
- 🐛 Issues: Check troubleshooting section in main guide
- 💬 Ask the team!

## Cheat Sheet

```typescript
// Setup
const env = await new FeatureTestBuilder()
  .withWallet(wallet)          // Add wallet
  .withAccount(account)        // Add account  
  .withBalance(balance)        // Add balance
  .withChain(chain)            // Add chain
  .withApi(chainId, api)       // Add API
  .build();                    // Build environment

// Feature operations
await env.startFeature(feature);        // Start feature
await env.stopFeature(feature);         // Stop feature

// Execute events
await env.executeEvent(event, params);  // With params
await env.executeEventVoid(event);      // No params

// Read state
const value = env.getState(store);      // Get store value

// Storage operations
await env.getStorageData('table');           // Read table
await env.verifyInStorage('table', fn);      // Verify condition
await env.addToStorage('table', data);       // Add data
await env.updateInStorage('table', id, {...}); // Update data
await env.deleteFromStorage('table', id);    // Delete data

// Wait for conditions
await env.waitForState(store, condition, timeout);

// Cleanup
await env.cleanup();              // Always cleanup!
```

Happy testing! 🎉

