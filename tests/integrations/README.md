# Integration Testing Framework

Test framework for Nova Spektr feature integration tests with real storage (fake IndexedDB) and Effector state management.

## 🚀 Quick Start

```typescript
import { afterEach, describe, expect, it } from 'vitest';

import { FeatureTestBuilder, type FeatureTestEnvironment } from '@tests/integrations/utils';
import { vaultWallet, senderAccount, senderBalance } from '@tests/integrations/fixtures';

describe('My Feature Tests', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
  });

  it('should work correctly', async () => {
    env = await new FeatureTestBuilder()
      .withWallet(vaultWallet)
      .withAccount(senderAccount)
      .withBalance(senderBalance)
      .build();

    await env.executeEvent(myFeature.events.doSomething, { data: 'test' });

    expect(env.getState(myFeature.$status)).toBe('running');
  });
});
```

## 📖 Documentation

- **[README.md](./README.md)** (this file) - Developer quick start guide
- **[.ai/CONTEXT.md](./.ai/CONTEXT.md)** - Complete AI testing guide
- **[.ai/ORGANIZATION.md](./.ai/ORGANIZATION.md)** - Feature-based structure guide

## 📁 Structure

```
tests/integrations/
├── .ai/                           # AI context and docs
│   ├── CONTEXT.md                # Complete testing guide
│   ├── ORGANIZATION.md           # Structure guide
│   └── MIGRATION.md              # Migration history
│
├── fixtures/                      # Test data (by domain)
│   ├── wallet/                   # Wallet fixtures
│   ├── account/                  # Account fixtures
│   ├── balance/                  # Balance fixtures
│   ├── chain/                    # Chain fixtures
│   └── transaction/              # Transaction templates
│
├── utils/                         # Testing utilities (by function)
│   ├── framework/                # Core framework ⭐
│   ├── builders/                 # Data builders
│   ├── network/                  # Network utilities
│   ├── xcm/                      # XCM tools
│   ├── chain/                    # Chain utilities
│   └── common/                   # Constants
│
├── tests/                         # Test files
│   ├── transfer-form-logic.integration.test.ts
│   ├── transfer-max-ed.integration.test.ts
│   └── xcm-destinations.integration.test.ts
│
└── README.md                      # This file
```

**See [.ai/ORGANIZATION.md](./.ai/ORGANIZATION.md) for detailed structure guide**

## 🛠️ Core Utilities

### FeatureTestBuilder

Fluent API for setting up test environments:

```typescript
const env = await new FeatureTestBuilder()
  .withWallet(vaultWallet)
  .withAccount(senderAccount)
  .withBalance(senderBalance)
  .withChain(polkadotChain)
  .build();
```

### FeatureTestEnvironment

High-level API for test execution:

```typescript
await env.executeEvent(feature.events.action, params);
const state = env.getState(feature.$store);
await env.verifyInStorage('tableName', condition);
await env.cleanup();  // Always cleanup!
```

### Scenario Helpers

Pre-configured test scenarios:

```typescript
import { createTransferScenario } from '@tests/integrations/utils';

env = await createTransferScenario();  // Full setup in one line!
```

Available scenarios:
- `createTransferScenario()` - Full transfer setup
- `createLowBalanceScenario()` - Test insufficient funds
- `createDisconnectedScenario()` - Test offline behavior
- `createMinimalScenario()` - Just wallet + account
- `createMultiAccountScenario()` - Multiple accounts

## 🎯 What to Test

### ✅ Use Integration Tests For:
- Feature logic with state management (Effector stores/events)
- Data persistence and retrieval (IndexedDB)
- Multi-step workflows
- Validation rules
- Transaction building

### ❌ Don't Use Integration Tests For:
- UI rendering → Use component tests
- Pure functions → Use unit tests
- Full user workflows → Use E2E tests (Playwright)

## 🧪 Running Tests

```bash
# Run all integration tests
pnpm test tests/integrations

# Run specific test file
pnpm test tests/integrations/tests/transfer-form-logic.integration.test.ts

# Watch mode
pnpm test:watch tests/integrations

# With coverage
pnpm test:coverage
```

## 📝 Writing Tests

### 1. Choose Your Approach

**Option A: Use Scenario Helper**
```typescript
env = await createTransferScenario();
```

**Option B: Use Builder**
```typescript
env = await new FeatureTestBuilder()
  .withWallet(vaultWallet)
  .withAccount(senderAccount)
  .build();
```

### 2. Write Test Logic

```typescript
it('should update state', async () => {
  env = await createTransferScenario();

  await env.executeEvent(formModel.events.toggleMaxMode, true);

  expect(env.getState(formModel.$isMaxModeEnabled)).toBe(true);
});
```

### 3. Always Cleanup

```typescript
afterEach(async () => {
  if (env) {
    await env.cleanup();
  }
});
```

## 🎨 Best Practices

### ✅ DO:
- Always call `env.cleanup()` in `afterEach`
- Use fixtures from `@tests/integrations/fixtures`
- Test both success and error scenarios
- Verify storage persistence when features save data
- Wait for async operations
- Use scenario helpers to reduce boilerplate

### ❌ DON'T:
- Forget to cleanup
- Reuse mutable objects between tests
- Test UI rendering (use component tests)
- Skip error scenario testing
- Hardcode test data (use fixtures)

## 🧹 Code Style

**ESLint Config**: [`/.eslintrc.cjs`](../../.eslintrc.cjs)

Key rules:
- Imports sorted alphabetically with newlines between groups
- Stores start with `$`: `const $counter = createStore(0)`
- Effects end with `Fx`: `const fetchDataFx = createEffect()`
- Use `array[]` not `Array<>`
- Inline type imports: `import { type Foo }`

**Auto-fix:**
```bash
pnpm lint:fix
pnpm fmt:fix
```

## 🔍 Examples

See working examples in [`tests/`](./tests/):

1. **[transfer-form-logic.integration.test.ts](./tests/transfer-form-logic.integration.test.ts)**
   - Form validation
   - MAX button logic
   - ED checkbox behavior
   - Multi-step workflows

2. **[transfer-max-ed.integration.test.ts](./tests/transfer-max-ed.integration.test.ts)**
   - Simple MAX + ED scenarios
   - Balance calculations

3. **[xcm-destinations.integration.test.ts](./tests/xcm-destinations.integration.test.ts)**
   - Cross-chain transfers
   - XCM destinations

## 🐛 Troubleshooting

**"Database is closed" error**
→ Accessing storage after cleanup. Move operations before `env.cleanup()`

**State not updating**
→ Missing `await` on `executeEvent()`. Always await async operations

**Import order errors**
→ Run `pnpm lint:fix` to auto-sort imports

**Linting errors**
→ Check [`.eslintrc.cjs`](../../.eslintrc.cjs) or run `pnpm lint:fix`

## 🤝 Contributing

When adding features:

1. Write integration tests using this framework
2. Use existing patterns and fixtures
3. Add new fixtures if needed
4. Follow code style (run `pnpm lint:fix`)
5. Test both success and error cases

## 📚 Additional Resources

- **Feature-Sliced Design**: [Project structure](../../CLAUDE.md)
- **Effector**: [Testing docs](https://effector.dev/docs/api/effector/fork)
- **fake-indexeddb**: [GitHub](https://github.com/dumbmatter/fakeIndexedDB)
- **Vitest**: [Documentation](https://vitest.dev/)

---

**Need help?** Check [`.ai/CONTEXT.md`](./.ai/CONTEXT.md) for complete reference or review example tests in [`tests/`](./tests/)
