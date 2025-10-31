# Integration Testing Cheat Sheet

## Quick Reference

### Import

```typescript
import { FeatureTestBuilder } from '@tests/integrations/utils';
import { vaultWallet, senderAccount, senderBalance } from '@tests/integrations/fixtures';
```

### Basic Setup

```typescript
describe('Feature Tests', () => {
  let env;

  beforeEach(async () => {
    env = await new FeatureTestBuilder()
      .withWallet(wallet)
      .withAccount(account)
      .build();
  });

  afterEach(async () => {
    await env.cleanup(); // ALWAYS CLEANUP!
  });
});
```

## Builder API

### Adding Data

```typescript
new FeatureTestBuilder()
  // Wallets
  .withWallet(wallet)
  .withWallets([wallet1, wallet2])

  // Accounts  
  .withAccount(account)
  .withAccounts([account1, account2])

  // Balances
  .withBalance(balance)
  .withBalances([balance1, balance2])

  // Chains
  .withChain(chain)
  .withChains([chain1, chain2])

  // Network
  .withApi(chainId, mockApi)
  .withConnectionStatus(chainId, 'CONNECTED')

  // Other
  .withContact(contact)
  .withProxy(proxy)
  .withMultisigOperation(operation)
  .withBasketTransaction(transaction)
  .withMetadata(metadata)

  // Custom store values
  .withStoreValue(store, value)

  .build(); // Returns FeatureTestEnvironment
```

## Environment API

### Feature Operations

```typescript
// Start/stop features
await env.startFeature(feature);
await env.stopFeature(feature);
```

### State Management

```typescript
// Read state
const value = env.getState(store);

// Execute events
await env.executeEvent(event, params);
await env.executeEventVoid(event); // No params

// Wait for conditions
await env.waitForState(
  store,
  value => value === 'expected',
  5000 // timeout ms
);
```

### Storage Operations

```typescript
// Read
const items = await env.getStorageData('tableName');
const isValid = await env.verifyInStorage('tableName', 
  items => items.length > 0
);

// Write
await env.addToStorage('tableName', data);
await env.addToStorage('tableName', [data1, data2]);

// Update
await env.updateInStorage('tableName', id, { changes });

// Delete
await env.deleteFromStorage('tableName', id);
```

### Cleanup

```typescript
await env.cleanup(); // Always call this!
```

## Storage Tables

| Table Name | Content |
|------------|---------|
| `wallets` | Wallet data |
| `accounts2` | Account data |
| `balances2` | Balance information |
| `contacts` | Contact list |
| `proxies` | Proxy relationships |
| `connections` | Network connections |
| `notifications` | User notifications |
| `basketTransactions` | Transaction basket |
| `multisigOperations` | Multisig operations |
| `metadata` | Chain metadata |

## Common Patterns

### Basic Test

```typescript
it('should do something', async () => {
  // 1. Start feature
  await env.startFeature(myFeature);

  // 2. Execute action
  await env.executeEvent(myFeature.events.action, params);

  // 3. Verify state
  expect(env.getState(myFeature.$result)).toBeDefined();

  // 4. Verify storage
  const data = await env.getStorageData('tableName');
  expect(data).toHaveLength(1);
});
```

### Async Workflow

```typescript
it('should complete async workflow', async () => {
  await env.startFeature(feature);
  
  // Start operation
  await env.executeEvent(feature.events.start, params);
  
  // Wait for completion
  await env.waitForState(
    feature.$status,
    status => status === 'completed',
    10000
  );
  
  // Verify result
  expect(env.getState(feature.$result)).toBeDefined();
});
```

### Error Scenario

```typescript
it('should handle errors', async () => {
  // Setup error condition
  const env = await new FeatureTestBuilder()
    .withBalance({ ...balance, total: '0' }) // No balance
    .build();

  await env.startFeature(transferFeature);

  // Attempt operation
  await env.executeEvent(transferFeature.events.transfer, {
    amount: '1000000000000',
  });

  // Verify error
  expect(env.getState(transferFeature.$errors)).toContain('insufficient');
});
```

### Multi-Step Test

```typescript
it('should complete multi-step process', async () => {
  await env.startFeature(feature);

  // Step 1
  await env.executeEvent(feature.events.step1, data1);
  expect(env.getState(feature.$step)).toBe(1);

  // Step 2
  await env.executeEvent(feature.events.step2, data2);
  expect(env.getState(feature.$step)).toBe(2);

  // Step 3
  await env.executeEvent(feature.events.step3, data3);
  expect(env.getState(feature.$step)).toBe(3);

  // Verify final state
  expect(env.getState(feature.$completed)).toBe(true);
});
```

### Storage Verification

```typescript
it('should persist data', async () => {
  await env.startFeature(feature);

  // Make changes
  await env.executeEvent(feature.events.create, newItem);

  // Verify in storage
  const isStored = await env.verifyInStorage('tableName',
    items => items.some(i => i.id === newItem.id)
  );
  expect(isStored).toBe(true);

  // Or get data directly
  const items = await env.getStorageData('tableName');
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject(newItem);
});
```

## Fixtures

### Available Fixtures

```typescript
// From @tests/integrations/fixtures

// Wallets
vaultWallet
multisigWallet
watchOnlyWallet
proxiedWallet

// Accounts
senderAccount
recipientAccount
multisigAccount
signatoryAccount
proxiedAccount
proxyAccount

// Balances
senderBalance
senderLowBalance
senderAssetHubBalance
senderUsdtBalance
multisigBalance
signatoryBalance
proxyBalance

// Chains
polkadotChain
kusamaChain
assetHubChain
bifrostChain

// Transactions
nativeTransferTx
assetTransferTx
xcmTransferTx
multisigTransferTx

// Helpers
createBalance(accountId, chainId, assetId, total)
createTransferTx(from, to, chainId, amount, type?)
```

### Creating Custom Fixtures

```typescript
// tests/integrations/fixtures/my-fixtures.ts
export const myWallet = {
  id: 100,
  name: 'My Test Wallet',
  type: WalletType.POLKADOT_VAULT,
  signingType: SigningType.POLKADOT_VAULT,
};

export const myAccount = {
  id: 'my-account-1',
  accountId: createAccountId(100),
  walletId: myWallet.id,
  name: 'My Test Account',
  type: 'base',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
};
```

## Assertions

### State Assertions

```typescript
// Boolean
expect(env.getState(feature.$isActive)).toBe(true);

// Objects
expect(env.getState(feature.$data)).toEqual({ ... });
expect(env.getState(feature.$data)).toMatchObject({ ... });

// Arrays
expect(env.getState(feature.$list)).toHaveLength(3);
expect(env.getState(feature.$list)).toContain(item);

// Nullish
expect(env.getState(feature.$data)).toBeDefined();
expect(env.getState(feature.$data)).toBeNull();
expect(env.getState(feature.$data)).toBeUndefined();
```

### Storage Assertions

```typescript
// Using verifyInStorage
const hasData = await env.verifyInStorage('wallets',
  wallets => wallets.length === 1
);
expect(hasData).toBe(true);

// Direct data check
const wallets = await env.getStorageData('wallets');
expect(wallets).toHaveLength(1);
expect(wallets[0].name).toBe('Test Wallet');
```

## Common Mistakes

### ❌ Forget cleanup

```typescript
it('bad test', async () => {
  const env = await new FeatureTestBuilder().build();
  // ... test
  // Missing cleanup!
});
```

### ✅ Always cleanup

```typescript
afterEach(async () => {
  await env.cleanup();
});
```

### ❌ Not awaiting async

```typescript
env.executeEvent(event, params); // Missing await
expect(env.getState(store)).toBe(value); // May fail
```

### ✅ Await async operations

```typescript
await env.executeEvent(event, params);
expect(env.getState(store)).toBe(value);
```

### ❌ Reusing mutable data

```typescript
const wallet = { id: 1, name: 'Test' };

it('test 1', async () => {
  wallet.name = 'Changed'; // Affects other tests!
});
```

### ✅ Fresh data per test

```typescript
beforeEach(async () => {
  const wallet = { id: 1, name: 'Test' }; // New each time
  env = await new FeatureTestBuilder()
    .withWallet(wallet)
    .build();
});
```

## Running Tests

```bash
# All tests
pnpm test

# Specific file
pnpm test path/to/test.ts

# Watch mode
pnpm test:watch

# With UI
pnpm test:ui

# Coverage
pnpm test:coverage

# Integration tests only
pnpm test tests/features
```

## Debugging

### Console logging

```typescript
it('debug test', async () => {
  const data = await env.getStorageData('wallets');
  console.log('Wallets:', data);

  const state = env.getState(feature.$data);
  console.log('State:', state);
});
```

### Breakpoints

```typescript
it('debug test', async () => {
  debugger; // Will pause in debugger
  await env.executeEvent(event, params);
  debugger; // Pause again
});
```

### Vitest UI

```bash
pnpm test:ui
# Opens interactive test UI in browser
```

## Resources

- [Quick Start](./QUICK_START.md)
- [Full Guide](./INTEGRATION_TESTING_GUIDE.md)
- [Examples](../tests/transfer-feature.integration.test.ts)
- [Vitest Docs](https://vitest.dev/)
- [Effector Testing](https://effector.dev/docs/api/effector/fork)

---

**Print this and keep it handy!** 📄

