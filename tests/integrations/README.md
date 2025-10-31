# Integration Testing Framework

A comprehensive testing framework for Nova Spektr feature integration tests with real storage (fake IndexedDB) and Effector state management.

## 🚀 Quick Start

```typescript
import { FeatureTestBuilder } from '@tests/integrations/utils';
import { vaultWallet, senderAccount, senderBalance } from '@tests/integrations/fixtures';

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
    await env.cleanup();
  });

  it('should work correctly', async () => {
    await env.startFeature(myFeature);
    await env.executeEvent(myFeature.events.doSomething, { data: 'test' });
    expect(env.getState(myFeature.$status)).toBe('running');
  });
});
```

## 📖 Documentation

- **[Quick Start Guide](./docs/QUICK_START.md)** - Get started in 5 minutes
- **[Testing Levels Guide](./docs/TESTING_LEVELS_GUIDE.md)** - **NEW!** When to use integration vs component vs E2E tests
- **[Integration Testing Guide](./docs/INTEGRATION_TESTING_GUIDE.md)** - Comprehensive documentation
- **[Cheat Sheet](./docs/CHEAT_SHEET.md)** - Quick reference
- **[Transfer Tests Example](./tests/transfer-form-logic.integration.test.ts)** - Real-world examples testing actual logic

## 📁 Structure

```
tests/integrations/
├── docs/                          # Documentation
│   ├── QUICK_START.md            # Quick start guide
│   ├── INTEGRATION_TESTING_GUIDE.md  # Full guide
│   └── CHEAT_SHEET.md            # Quick reference
│
├── utils/                         # Core testing utilities
│   ├── index.ts                  # Exports
│   ├── TestStorageBuilder.ts    # Storage management
│   ├── FeatureTestEnvironment.ts # Test environment API
│   └── FeatureTestBuilder.ts    # Fluent builder for setup
│
├── fixtures/                      # Test data fixtures
│   ├── index.ts                  # Exports
│   └── transfer-fixtures.ts     # Transfer test fixtures
│
├── tests/                         # Integration test examples
│   └── transfer-feature.integration.test.ts
│
└── README.md                      # This file
```

## 🛠️ Core Utilities

### TestStorageBuilder

Creates and manages fake IndexedDB storage for tests.

```typescript
const storage = new TestStorageBuilder()
  .withWallet(mockWallet)
  .withAccount(mockAccount)
  .withBalance(mockBalance);

await storage.build();
await storage.verifyTable('wallets', wallets => wallets.length === 1);
await storage.cleanup();
```

### FeatureTestEnvironment

High-level API for interacting with features in tests.

```typescript
await env.startFeature(myFeature);
await env.executeEvent(myFeature.events.action, params);
const state = env.getState(myFeature.$store);
await env.verifyInStorage('table', condition);
await env.cleanup();
```

### FeatureTestBuilder

Fluent API for building complete test environments.

```typescript
const env = await new FeatureTestBuilder()
  .withWallet(vaultWallet)
  .withAccount(senderAccount)
  .withBalance(senderBalance)
  .withChain(polkadotChain)
  .build();
```

## 🎯 What to Test

### ✅ Integration Tests (this framework)

Use for testing:
- Feature logic with real storage
- Data persistence and retrieval
- Multi-step workflows
- Feature interactions
- State management with storage
- Validation rules

## 📊 Test Coverage

The framework supports testing:

### Transfer Types
- ✅ Native transfers (DOT, KSM)
- ✅ Asset transfers (USDT, custom tokens)
- ✅ ORML token transfers
- ✅ XCM/Cross-chain transfers
- ✅ Multisig transfers
- ✅ Proxied transfers
- ✅ Batch transfers

### Wallet Types
- ✅ Polkadot Vault
- ✅ Multisig wallets
- ✅ Watch-only wallets
- ✅ Proxied wallets

## 🧪 Running Tests

```bash
# Run all integration tests
pnpm test tests/integrations

# Run specific test file
pnpm test tests/integrations/tests/transfer-feature.integration.test.ts

# Watch mode
pnpm test:watch tests/integrations

# With UI
pnpm test:ui

# With coverage
pnpm test:coverage
```

## 📝 Writing Your First Test

### 1. Create test file

Create a new file in `tests/integrations/tests/`:

```typescript
// tests/integrations/tests/my-feature.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeatureTestBuilder } from '@tests/integrations/utils';

describe('My Feature Integration', () => {
  let env;

  beforeEach(async () => {
    env = await new FeatureTestBuilder()
      // Setup your test data
      .build();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it('should do something', async () => {
    // Your test here
  });
});
```

### 2. Add fixtures (if needed)

Create fixtures in `tests/integrations/fixtures/`:

```typescript
// tests/integrations/fixtures/my-feature-fixtures.ts
export const myWallet = { /* ... */ };
export const myAccount = { /* ... */ };
```

### 3. Write tests

Follow the patterns in `tests/integrations/tests/transfer-feature.integration.test.ts`

## 🎨 Best Practices

### ✅ DO

- Always call `env.cleanup()` in `afterEach`
- Use fixtures for reusable test data
- Test both success and error scenarios
- Verify storage persistence
- Wait for async operations
- Create fresh data per test

### ❌ DON'T

- Forget to cleanup
- Reuse mutable objects between tests
- Skip error scenario testing
- Hardcode test data (use fixtures)

## 🔍 Example Tests

See `tests/integrations/tests/transfer-feature.integration.test.ts` for examples:

1. **Native Transfers** - Simple token transfers
2. **Asset Transfers** - USDT and custom tokens
3. **XCM Transfers** - Cross-chain transfers
4. **Multisig Transfers** - Multi-signature transactions
5. **Proxied Transfers** - Through proxy accounts
6. **Validation Rules** - Balance checks, address validation
7. **Error Scenarios** - Network issues, insufficient funds
8. **Complex Scenarios** - Batch transactions, combined operations

## 🐛 Troubleshooting

See the [Troubleshooting section](./docs/INTEGRATION_TESTING_GUIDE.md#troubleshooting) in the full guide.

## 🤝 Contributing

When adding new features:

1. Write integration tests using this framework
2. Add fixtures if needed
3. Document any special setup requirements
4. Follow existing test patterns

## 📚 Additional Resources

- [Effector Testing](https://effector.dev/docs/api/effector/fork)
- [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB)
- [Vitest](https://vitest.dev/)

---

**Need help?** Check the [full documentation](./docs/INTEGRATION_TESTING_GUIDE.md) or ask the team!

