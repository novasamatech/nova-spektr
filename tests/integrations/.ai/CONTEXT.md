# Integration Testing Framework - AI Context

**For AI Assistants**: This file contains everything you need to write integration tests for Nova Spektr.

**Also see:** [ORGANIZATION.md](./ORGANIZATION.md) - Feature-based structure guide

## 📋 Quick Start

### What to Test

✅ **Integration Tests** (this framework):
- Feature model logic (Effector stores/events)
- Storage persistence (IndexedDB read/write)
- State management workflows
- Validation rules
- Transaction building

❌ **NOT Integration Tests**:
- UI rendering → Component tests
- Pure functions → Unit tests
- Full user flows → E2E tests

### Basic Test Structure

```typescript
import { afterEach, describe, expect, it } from 'vitest';

import { FeatureTestBuilder, type FeatureTestEnvironment } from '@tests/integrations/utils';
import { featureModel } from '@/path/to/feature/model';
import { vaultWallet, senderAccount } from '@tests/integrations/fixtures';

describe('Feature Name', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) {
      await env.cleanup(); // CRITICAL - Always cleanup!
    }
  });

  it('should do something', async () => {
    // ARRANGE: Setup environment
    env = await new FeatureTestBuilder()
      .withWallet(vaultWallet)
      .withAccount(senderAccount)
      .build();

    // ACT: Execute feature logic
    await env.executeEvent(featureModel.events.action, params);

    // ASSERT: Verify results
    expect(env.getState(featureModel.$store)).toBe(expected);
  });
});
```

---

## 🏗️ Framework Architecture

### Data Flow

```
TestStorageBuilder (seeds fake IndexedDB)
        ↓
FeatureTestBuilder (creates Effector scope + populates stores)
        ↓
FeatureTestEnvironment (provides test API)
        ↓
Your Tests (execute events, verify state, check storage)
```

### Core Classes

**1. TestStorageBuilder** - Manages fake IndexedDB
```typescript
const storage = new TestStorageBuilder()
  .withWallet(wallet)
  .withAccount(account)
  .withBalance(balance);
```

**2. FeatureTestBuilder** - Fluent API for setup
```typescript
const env = await new FeatureTestBuilder()
  .withWallet(vaultWallet)
  .withAccount(senderAccount)
  .withBalance(senderBalance)
  .withChain(polkadotChain)
  .build();
```

**3. FeatureTestEnvironment** - Test execution API
```typescript
await env.executeEvent(event, params);
const state = env.getState(store);
await env.verifyInStorage('table', condition);
```

---

## 🔧 API Reference

### FeatureTestBuilder Methods

**Storage Setup:**
```typescript
.withWallet(wallet)              // Single wallet
.withWallets(wallets)            // Multiple wallets
.withAccount(account)            // Single account
.withAccounts(accounts)          // Multiple accounts
.withBalance(balance)            // Single balance
.withBalances(balances)          // Multiple balances
.withContact(contact)            // Contact
.withProxy(proxy)                // Proxy
```

**Network Setup:**
```typescript
.withChain(chain)                // Chain configuration
.withChains(chains)              // Multiple chains
.withConnectionStatus(chainId, status)  // Connection state
```

**Build:**
```typescript
await .build()                   // Returns FeatureTestEnvironment
```

### FeatureTestEnvironment Methods

**State:**
```typescript
env.getState(store)              // Read store value
await env.executeEvent(event, params)    // Execute event
await env.waitForState(store, condition, timeout)  // Wait for condition
```

**Storage:**
```typescript
await env.getStorageData(tableName)      // Get all data
await env.verifyInStorage(table, condition)  // Verify condition
await env.addToStorage(table, data)      // Add during test
```

**Cleanup:**
```typescript
await env.cleanup()              // ALWAYS call in afterEach
```

### Scenario Helpers

```typescript
import {
  createTransferScenario,      // Full transfer setup
  createLowBalanceScenario,     // Low balance for error testing
  createDisconnectedScenario,   // Offline testing
  createMinimalScenario,        // Just wallet + account
  createMultiAccountScenario,   // Multiple accounts
} from '@tests/integrations/utils';

// Usage
env = await createTransferScenario();
```

### Available Fixtures

```typescript
import {
  // Wallets
  vaultWallet,
  watchOnlyWallet,
  multisigWallet,

  // Accounts
  senderAccount,
  recipientAccount,

  // Balances
  senderBalance,

  // Chains
  polkadotChain,
  polkadotChainId,
  kusamaChain,
} from '@tests/integrations/fixtures';
```

---

## 📦 Project Structure

### Nova Spektr Architecture (Feature-Sliced Design)

```
src/renderer/
├── app/           # App initialization
├── pages/         # Route components
├── widgets/       # Complex UI blocks
│   └── Transfer/default/model/  ← Feature models here
├── features/      # Business logic
├── entities/      # Business entities
│   ├── wallet/model/
│   ├── balance/model/
│   └── network/model/
└── shared/        # Utilities
```

### Storage Schema (IndexedDB)

```typescript
{
  wallets: '++id',
  accounts2: 'id',                    // Note: "accounts2" not "accounts"
  balances2: '[accountId+chainId+assetId]',  // Note: "balances2"
  contacts: '++id',
  proxies: '++id',
  basketTransactions: '++id',
  multisigOperations: 'id',
}
```

---

## 🎨 Common Patterns

### Pattern 1: Form Fields (use allSettled)

```typescript
import { allSettled } from 'effector';

// ✅ CORRECT: Use allSettled for form fields
await allSettled(formModel.form.fields.amount.onChange, {
  scope: env.scope,
  params: '100',
});

// ❌ WRONG: Don't use executeEvent
await env.executeEvent(formModel.form.fields.amount.onChange, '100');
```

### Pattern 2: Verify Storage

```typescript
// After creating entity
await env.executeEvent(featureModel.events.create, data);

// Verify in store
expect(env.getState(featureModel.$entities)).toHaveLength(1);

// Verify in storage
const stored = await env.getStorageData('tableName');
expect(stored).toHaveLength(1);
```

### Pattern 3: Wait for Async

```typescript
// Execute async operation
await env.executeEvent(feature.events.start);

// Wait for completion
await env.waitForState(
  feature.$status,
  status => status === 'completed',
  5000  // timeout ms
);
```

---

## 🧹 Code Style Rules

**ESLint Config**: [`/.eslintrc.cjs`](../../../.eslintrc.cjs)

### Essential Rules

**1. Imports (sorted alphabetically, newlines between groups):**
```typescript
import { afterEach, describe, expect, it } from 'vitest';

import { formModel } from '@/widgets/Transfer/default/model/form-model';
import { FeatureTestBuilder } from '@tests/integrations/utils';
import { vaultWallet } from '@tests/integrations/fixtures';
```

**2. Effector Naming:**
```typescript
const $counter = createStore(0);        // Stores: start with $
const fetchDataFx = createEffect(() => {});  // Effects: end with Fx
```

**3. TypeScript:**
```typescript
const items: string[] = [];             // Use array[] not Array<>
import { type Balance } from '@/shared/core';  // Inline type imports
const handler = (_event: Event) => {};  // Prefix unused with _
```

**4. Auto-fix:**
```bash
pnpm lint:fix && pnpm fmt:fix
```

---

## 🚫 Common Mistakes

### 1. Forgetting Cleanup
```typescript
// ❌ BAD
it('test', async () => {
  const env = await new FeatureTestBuilder().build();
  // ... Missing cleanup!
});

// ✅ GOOD
afterEach(async () => {
  if (env) await env.cleanup();
});
```

### 2. Testing UI Instead of Logic
```typescript
// ❌ BAD: Testing UI
render(<Component />);
expect(screen.getByText('MAX')).toBeInTheDocument();

// ✅ GOOD: Testing logic
await env.executeEvent(formModel.events.toggleMaxMode, true);
expect(env.getState(formModel.$isMaxModeEnabled)).toBe(true);
```

### 3. Not Waiting for Async
```typescript
// ❌ BAD: Missing await
env.executeEvent(feature.events.action);  // No await!

// ✅ GOOD
await env.executeEvent(feature.events.action);
```

### 4. Inline Data Instead of Fixtures
```typescript
// ❌ BAD
.withWallet({ id: 1, name: 'Test', ... })

// ✅ GOOD
.withWallet(vaultWallet)
```

---

## 📝 Test Templates

### Template 1: Basic Logic Test

```typescript
describe('Feature Logic', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) await env.cleanup();
  });

  it('should update state when event fires', async () => {
    env = await new FeatureTestBuilder()
      .withWallet(vaultWallet)
      .build();

    await env.executeEvent(featureModel.events.update, { value: 'new' });

    expect(env.getState(featureModel.$value)).toBe('new');
  });
});
```

### Template 2: Storage Persistence Test

```typescript
it('should persist to storage', async () => {
  env = await new FeatureTestBuilder()
    .withWallet(vaultWallet)
    .build();

  await env.executeEvent(featureModel.events.create, {
    id: 'test-1',
    name: 'Test Entity',
  });

  // Verify in store
  expect(env.getState(featureModel.$entities)).toHaveLength(1);

  // Verify in storage
  const stored = await env.getStorageData('tableName');
  expect(stored).toHaveLength(1);
  expect(stored[0].name).toBe('Test Entity');
});
```

### Template 3: Form Validation Test

```typescript
it('should validate form input', async () => {
  env = await new FeatureTestBuilder()
    .withWallet(vaultWallet)
    .withAccount(senderAccount)
    .withBalance(senderBalance)
    .withChain(polkadotChain)
    .build();

  await env.executeEvent(formModel.formInitiated, {
    chain: polkadotChain,
    asset: polkadotChain.assets[0],
  });

  // Invalid input
  await allSettled(formModel.form.fields.address.onChange, {
    scope: env.scope,
    params: 'invalid-address',
  });

  expect(env.getState(formModel.$errors).length).toBeGreaterThan(0);
  expect(env.getState(formModel.$canSubmit)).toBe(false);

  // Valid input
  await allSettled(formModel.form.fields.address.onChange, {
    scope: env.scope,
    params: recipientAccount.accountId,
  });

  expect(env.getState(formModel.$canSubmit)).toBe(true);
});
```

---

## 🎯 Effector Concepts

### Store
Holds state:
```typescript
const $counter = createStore(0);
```

### Event
Triggers state changes:
```typescript
const increment = createEvent();
$counter.on(increment, (state) => state + 1);
```

### Effect
Async operations:
```typescript
const fetchDataFx = createEffect(async () => { /* ... */ });
```

### Testing with Scopes
```typescript
const scope = fork();  // Isolated state
scope.getState($counter);  // Read
allSettled(increment, { scope });  // Execute
```

---

## 🔍 Debugging Tips

### Log State
```typescript
console.log('State:', env.getState(featureModel.$store));
```

### Log Storage
```typescript
const data = await env.getStorageData('wallets');
console.log('Storage:', data);
```

### Check Async Completion
```typescript
await env.executeEvent(feature.events.action);
await new Promise(resolve => setTimeout(resolve, 100));
console.log('After delay:', env.getState(feature.$status));
```

---

## ✅ Testing Checklist

Before writing:
- [ ] Feature requires integration testing (not unit/component/E2E)
- [ ] Chosen appropriate template/scenario

While writing:
- [ ] Imports sorted alphabetically
- [ ] Stores start with `$`, effects end with `Fx`
- [ ] Using fixtures (not inline data)
- [ ] `afterEach` cleanup present
- [ ] Testing logic (not UI)
- [ ] Awaiting all async operations

After writing:
- [ ] Run: `pnpm test path/to/test.ts`
- [ ] Fix linting: `pnpm lint:fix`
- [ ] All assertions pass
- [ ] Tested error scenarios

---

## 📚 Example Tests

See real examples:
- `tests/transfer-form-logic.integration.test.ts` - Form logic with validation
- `tests/transfer-max-ed.integration.test.ts` - MAX button + ED checkbox
- `tests/xcm-destinations.integration.test.ts` - Cross-chain transfers

---

## 🚀 Quick Commands

```bash
# Run single test
pnpm test tests/integrations/tests/my-test.integration.test.ts

# Watch mode
pnpm test:watch tests/integrations

# Fix linting
pnpm lint:fix

# Fix formatting
pnpm fmt:fix

# Type check
pnpm types
```

---

**That's everything you need to write integration tests!** 🎉

For human developers, see [`README.md`](../README.md)
