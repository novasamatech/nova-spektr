# Integration Testing Guide

## Overview

This guide explains how to write integration tests for Nova Spektr features using our custom testing framework. The framework provides a complete testing environment with real storage (fake IndexedDB), Effector state management, and feature-level abstractions.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Utilities](#core-utilities)
3. [Writing Tests](#writing-tests)
4. [Best Practices](#best-practices)
5. [Common Patterns](#common-patterns)
6. [Troubleshooting](#troubleshooting)

## Architecture

Our integration testing approach combines:

- **Fake IndexedDB** (`fake-indexeddb`) - Provides realistic storage behavior without actual database operations
- **Effector Scopes** (`fork()`) - Isolates state for each test
- **Test Builders** - Fluent API for setting up test environments
- **Feature Testing Utilities** - High-level helpers for testing features

### Testing Layers

```
┌─────────────────────────────────────┐
│     Feature Integration Tests       │
├─────────────────────────────────────┤
│    FeatureTestEnvironment API       │
├─────────────────────────────────────┤
│  FeatureTestBuilder (Setup)         │
├─────────────────────────────────────┤
│  TestStorageBuilder (Data)          │
├─────────────────────────────────────┤
│  Fake IndexedDB + Effector Scopes   │
└─────────────────────────────────────┘
```

## Core Utilities

### TestStorageBuilder

Creates and manages fake IndexedDB storage for tests.

**Location:** `tests/utils/TestStorageBuilder.ts`

**Purpose:** 
- Set up database schema matching production
- Seed test data
- Verify storage state during tests

**Example:**
```typescript
import { TestStorageBuilder } from '@tests/utils';

const storage = new TestStorageBuilder()
  .withWallet(mockWallet)
  .withAccount(mockAccount)
  .withBalance(mockBalance);

await storage.build();

// Verify data was stored
const hasWallet = await storage.verifyTable('wallets', 
  wallets => wallets.length === 1
);

await storage.cleanup();
```

### FeatureTestEnvironment

Provides high-level API for interacting with features in tests.

**Location:** `tests/utils/FeatureTestEnvironment.ts`

**Purpose:**
- Start/stop features
- Execute events
- Read store values
- Verify storage state

**Example:**
```typescript
const env: FeatureTestEnvironment = // ... created by builder

// Start a feature
await env.startFeature(myFeature);

// Check feature status
expect(env.getState(myFeature.status)).toBe('running');

// Execute an event
await env.executeEvent(myFeature.events.doSomething, { data: 'test' });

// Verify storage
await env.verifyInStorage('wallets', wallets => wallets.length === 2);

// Cleanup
await env.cleanup();
```

### FeatureTestBuilder

Fluent API for building complete test environments.

**Location:** `tests/utils/FeatureTestBuilder.ts`

**Purpose:**
- Combine storage setup and Effector scope creation
- Pre-populate stores with data
- Configure network connections and chains

**Example:**
```typescript
import { FeatureTestBuilder } from '@tests/utils';

const env = await new FeatureTestBuilder()
  .withWallet(vaultWallet)
  .withAccount(senderAccount)
  .withBalance(senderBalance)
  .withChain(polkadotChain)
  .build();

// Use env for testing
await env.startFeature(transferFeature);

await env.cleanup();
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeatureTestBuilder } from '@tests/utils';
import { myFeature } from '@/features/my-feature';

describe('MyFeature Integration Tests', () => {
  let env: FeatureTestEnvironment;

  beforeEach(async () => {
    // Setup test environment
    env = await new FeatureTestBuilder()
      .withWallet(mockWallet)
      .withAccount(mockAccount)
      .build();
  });

  afterEach(async () => {
    // Always cleanup
    await env.cleanup();
  });

  it('should do something', async () => {
    // Start feature
    await env.startFeature(myFeature);

    // Execute logic
    await env.executeEvent(myFeature.events.someAction, { data: 'test' });

    // Verify state
    expect(env.getState(myFeature.$someStore)).toBe('expected value');

    // Verify storage
    const isValid = await env.verifyInStorage('tableName', 
      items => items.length === 1
    );
    expect(isValid).toBe(true);
  });
});
```

### Testing Features with Storage

```typescript
it('should persist data to storage', async () => {
  const env = await new FeatureTestBuilder()
    .withWallet(testWallet)
    .build();

  await env.startFeature(walletFeature);

  // Create a new account
  await env.executeEvent(walletFeature.events.createAccount, {
    name: 'New Account',
    accountId: testAccountId,
  });

  // Verify it was saved to storage
  const accounts = await env.getStorageData('accounts2');
  expect(accounts).toHaveLength(1);
  expect(accounts[0].name).toBe('New Account');

  await env.cleanup();
});
```

### Testing with Network State

```typescript
it('should work with network connections', async () => {
  const mockApi = {
    isConnected: true,
    query: {
      // Mock query methods
    },
  };

  const env = await new FeatureTestBuilder()
    .withChain(polkadotChain)
    .withApi(polkadotChainId, mockApi)
    .withConnectionStatus(polkadotChainId, 'CONNECTED')
    .build();

  await env.startFeature(networkFeature);

  // Feature can now use the mocked API
  const status = env.getState(networkFeature.$connectionStatus);
  expect(status).toBe('connected');

  await env.cleanup();
});
```

### Testing Async Workflows

```typescript
it('should handle async workflows', async () => {
  const env = await new FeatureTestBuilder()
    .withWallet(wallet)
    .withAccount(account)
    .build();

  await env.startFeature(transferFeature);

  // Start async operation
  await env.executeEvent(transferFeature.events.startTransfer, {
    to: recipientId,
    amount: '1000',
  });

  // Wait for state change
  await env.waitForState(
    transferFeature.$status,
    status => status === 'completed',
    5000 // timeout
  );

  // Verify final state
  expect(env.getState(transferFeature.$lastTransfer)).toBeDefined();

  await env.cleanup();
});
```

## Best Practices

### 1. Always Cleanup

Always call `env.cleanup()` in `afterEach` or `finally` blocks to prevent test pollution:

```typescript
afterEach(async () => {
  await env.cleanup();
});

// Or with try/finally
it('should test something', async () => {
  const env = await new FeatureTestBuilder().build();
  
  try {
    // Test logic
  } finally {
    await env.cleanup();
  }
});
```

### 2. Use Fixtures

Create reusable fixtures for common test scenarios:

```typescript
// tests/fixtures/transfer-fixtures.ts
export const senderWallet = { ... };
export const senderAccount = { ... };
export const recipientAccount = { ... };

// In tests
import { senderWallet, senderAccount } from '@tests/fixtures/transfer-fixtures';

const env = await new FeatureTestBuilder()
  .withWallet(senderWallet)
  .withAccount(senderAccount)
  .build();
```

### 3. Test Data Persistence

Always verify that features persist data correctly:

```typescript
it('should save changes to storage', async () => {
  const env = await new FeatureTestBuilder()
    .withWallet(wallet)
    .build();

  await env.startFeature(myFeature);

  // Make changes
  await env.executeEvent(myFeature.events.update, { name: 'Updated' });

  // Verify in storage
  const data = await env.getStorageData('wallets');
  expect(data[0].name).toBe('Updated');

  await env.cleanup();
});
```

### 4. Isolate Test Data

Each test should have its own isolated data to prevent interference:

```typescript
// ✅ Good - isolated data per test
beforeEach(async () => {
  env = await new FeatureTestBuilder()
    .withWallet({ id: 1, name: 'Test' })
    .build();
});

// ❌ Bad - shared mutable data
const sharedWallet = { id: 1, name: 'Test' };
beforeEach(async () => {
  env = await new FeatureTestBuilder()
    .withWallet(sharedWallet) // Don't reuse mutable objects
    .build();
});
```

### 5. Test Error Scenarios

Don't just test happy paths - test error conditions:

```typescript
it('should handle insufficient balance', async () => {
  const env = await new FeatureTestBuilder()
    .withWallet(wallet)
    .withAccount(account)
    .withBalance({ ...balance, total: '100' }) // Low balance
    .build();

  await env.startFeature(transferFeature);

  await env.executeEvent(transferFeature.events.transfer, {
    to: recipient,
    amount: '1000', // More than balance
  });

  // Verify error state
  expect(env.getState(transferFeature.$errors)).toContain('insufficient balance');

  await env.cleanup();
});
```

## Common Patterns

### Pattern 1: Pre-configured Scenarios

Create builder methods for common scenarios:

```typescript
class CustomTestBuilder extends FeatureTestBuilder {
  withTransferScenario() {
    return this
      .withWallet(vaultWallet)
      .withAccount(senderAccount)
      .withAccount(recipientAccount)
      .withBalance(senderBalance)
      .withChain(polkadotChain);
  }

  withMultisigScenario() {
    return this
      .withWallet(multisigWallet)
      .withAccount(multisigAccount)
      .withAccounts(signatoryAccounts)
      .withBalances(signatoryBalances);
  }
}

// Usage
const env = await new CustomTestBuilder()
  .withTransferScenario()
  .build();
```

### Pattern 2: Testing Multi-Step Workflows

```typescript
it('should complete full transfer workflow', async () => {
  const env = await new FeatureTestBuilder()
    .withWallet(wallet)
    .withAccount(sender)
    .withBalance(balance)
    .build();

  await env.startFeature(transferFeature);

  // Step 1: Enter amount
  await env.executeEvent(transferFeature.events.setAmount, '100');
  expect(env.getState(transferFeature.$amount)).toBe('100');

  // Step 2: Enter destination
  await env.executeEvent(transferFeature.events.setDestination, recipientId);
  expect(env.getState(transferFeature.$destination)).toBe(recipientId);

  // Step 3: Validate
  await env.executeEvent(transferFeature.events.validate);
  expect(env.getState(transferFeature.$isValid)).toBe(true);

  // Step 4: Submit
  await env.executeEvent(transferFeature.events.submit);
  await env.waitForState(transferFeature.$status, s => s === 'completed');

  // Verify final state
  expect(env.getState(transferFeature.$submitted)).toBe(true);

  await env.cleanup();
});
```

### Pattern 3: Testing Feature Dependencies

```typescript
it('should work with dependent features', async () => {
  const env = await new FeatureTestBuilder()
    .withWallet(wallet)
    .withAccount(account)
    .build();

  // Start all required features
  await env.startFeature(walletFeature);
  await env.startFeature(networkFeature);
  await env.startFeature(transferFeature);

  // Transfer feature depends on wallet and network features
  expect(env.getState(transferFeature.status)).toBe('running');
  expect(env.getState(transferFeature.$wallet)).toBeDefined();
  expect(env.getState(transferFeature.$network)).toBeDefined();

  await env.cleanup();
});
```

### Pattern 4: Snapshot Testing for Storage

```typescript
it('should match expected storage structure', async () => {
  const env = await new FeatureTestBuilder()
    .withWallet(wallet)
    .withAccount(account)
    .build();

  await env.startFeature(myFeature);
  await env.executeEvent(myFeature.events.setupData);

  // Get storage data
  const wallets = await env.getStorageData('wallets');
  const accounts = await env.getStorageData('accounts2');

  // Snapshot test
  expect({ wallets, accounts }).toMatchSnapshot();

  await env.cleanup();
});
```

## Troubleshooting

### Issue: Tests fail with "Database is closed"

**Cause:** Trying to access storage after cleanup

**Solution:** Make sure all storage operations happen before cleanup:

```typescript
it('should work correctly', async () => {
  const env = await new FeatureTestBuilder().build();

  try {
    // All operations here
    await env.startFeature(myFeature);
    const data = await env.getStorageData('wallets'); // ✅ Before cleanup
  } finally {
    await env.cleanup();
  }

  // const data = await env.getStorageData('wallets'); // ❌ After cleanup
});
```

### Issue: State not updating as expected

**Cause:** Not waiting for async effects to complete

**Solution:** Use `waitForState` or ensure `allSettled` completes:

```typescript
// ❌ Bad - doesn't wait for effects
env.executeEvent(feature.events.doSomething, params);
expect(env.getState(feature.$result)).toBeDefined(); // May fail

// ✅ Good - waits for completion
await env.executeEvent(feature.events.doSomething, params);
expect(env.getState(feature.$result)).toBeDefined();

// ✅ Better - waits for specific condition
await env.executeEvent(feature.events.doSomething, params);
await env.waitForState(feature.$result, result => result !== null);
expect(env.getState(feature.$result)).toBeDefined();
```

### Issue: Test data pollution

**Cause:** Reusing mutable objects or not cleaning up properly

**Solution:** Create fresh data for each test:

```typescript
// ✅ Good - create fresh data
beforeEach(async () => {
  const wallet = { id: 1, name: 'Test' }; // New object each time
  env = await new FeatureTestBuilder()
    .withWallet(wallet)
    .build();
});

afterEach(async () => {
  await env.cleanup(); // Always cleanup
});
```

### Issue: Fake IndexedDB behaves differently than real one

**Cause:** Some edge cases may not be perfectly replicated

**Solution:** 
1. Check `fake-indexeddb` documentation for known limitations
2. Consider using E2E tests with Playwright for critical flows
3. Report issues to the `fake-indexeddb` project

### Issue: Effector scope state leaks between tests

**Cause:** Not creating fresh scopes or cleanup issues

**Solution:** Always create new scopes via FeatureTestBuilder:

```typescript
// ✅ Good - fresh scope per test
beforeEach(async () => {
  env = await new FeatureTestBuilder().build(); // New scope
});

afterEach(async () => {
  await env.cleanup();
});
```

## Performance Tips

1. **Reuse fixtures** - Create fixture objects once, clone them in tests
2. **Minimize data** - Only add data you need for the test
3. **Parallel tests** - Vitest runs tests in parallel by default
4. **Skip expensive operations** - Mock network calls when not needed

```typescript
// Group related tests for better performance
describe('Transfer Feature', () => {
  describe('Native Transfers', () => {
    // Tests here share similar setup
  });

  describe('XCM Transfers', () => {
    // Different setup for XCM tests
  });
});
```

## Example Test Suite

See `tests/features/transfers/transfer-feature.integration.test.ts` for a complete example covering:
- Native transfers
- Asset transfers
- XCM transfers
- Multisig transfers
- Proxied transfers
- Error scenarios
- Validation rules

## Additional Resources

- [Effector Testing Docs](https://effector.dev/docs/api/effector/fork)
- [fake-indexeddb Documentation](https://github.com/dumbmatter/fakeIndexedDB)
- [Vitest Documentation](https://vitest.dev/)
- Project Architecture: `/docs/`

