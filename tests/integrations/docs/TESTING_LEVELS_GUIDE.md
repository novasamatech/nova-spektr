# Testing Levels Guide - When to Use What

This guide explains the different testing levels available in Nova Spektr and when to use each approach.

## Quick Decision Tree

```
┌─ Testing what? ─────────────────────────────────┐
│                                                  │
│  Pure function / utility?                       │
│  └─> Unit Test (no test utils needed)           │
│                                                  │
│  Feature MODEL logic + storage?                 │
│  └─> Integration Test (THIS FRAMEWORK)          │
│                                                  │
│  React component rendering/behavior?            │
│  └─> Component Test (@testing-library/react)    │
│                                                  │
│  Full user workflow in browser?                 │
│  └─> E2E Test (Playwright - tests/system)       │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Testing Levels Explained

### Level 1: Unit Tests (Pure Logic)

**What**: Pure functions, utilities, calculations
**Where**: Colocated with source (`*.test.ts` files)
**Tools**: Vitest only
**No special utilities needed**

**Example:**
```typescript
// src/shared/lib/utils/__tests__/balance.test.ts
import { formatBalance } from '../balance';

describe('formatBalance', () => {
  it('should format DOT balance correctly', () => {
    const result = formatBalance('10000000000', 10);
    expect(result).toBe('1.00');
  });
});
```

**When to use:**
- ✅ Pure functions
- ✅ Calculations
- ✅ String/number utilities
- ✅ Type guards
- ✅ No external dependencies

**Don't use for:**
- ❌ Effector stores/events
- ❌ Storage operations
- ❌ React components
- ❌ Network calls

---

### Level 2: Integration Tests (Feature Logic + Storage)

**What**: Feature model logic with real storage behavior
**Where**: `tests/integrations/tests/`
**Tools**: THIS FRAMEWORK (FeatureTestBuilder + fake-indexeddb)
**Use our testing utilities**

**Example:**
```typescript
// tests/integrations/tests/transfer-form-logic.integration.test.ts
import { FeatureTestBuilder } from '@tests/integrations/utils';
import { formModel } from '@/widgets/Transfer/default/model/form-model';

it('should show ED checkbox when MAX button is clicked', async () => {
  const env = await new FeatureTestBuilder()
    .withWallet(vaultWallet)
    .withAccount(senderAccount)
    .withBalance(senderBalance)
    .withChain(polkadotChain)
    .build();

  // Initialize form
  await env.executeEvent(formModel.formInitiated, {
    chain: polkadotChain,
    asset: polkadotChain.assets[0],
  });

  // Initial state: ED switch hidden
  expect(env.getState(formModel.$showEDSwitch)).toBe(false);

  // Click MAX button
  await env.executeEvent(formModel.events.toggleMaxMode, true);

  // Verify: ED switch appears
  expect(env.getState(formModel.$showEDSwitch)).toBe(true);
  expect(env.getState(formModel.$isMaxModeEnabled)).toBe(true);

  await env.cleanup();
});
```

**When to use:**
- ✅ Feature model logic (Effector stores/events)
- ✅ Storage read/write operations
- ✅ State management workflows
- ✅ Business logic with data persistence
- ✅ Validation rules
- ✅ Multi-step workflows

**Don't use for:**
- ❌ UI rendering (use component tests)
- ❌ User interactions like clicking buttons (use E2E)
- ❌ Network requests (mock them)
- ❌ Pure functions (use unit tests)

**What you're testing:**
- State changes after events
- Storage persistence after operations
- Validation logic with real data
- Transaction building from form data

---

### Level 3: Component Tests (React Components)

**What**: React component rendering and behavior
**Where**: Colocated with components (`*.test.tsx`)
**Tools**: @testing-library/react
**Can combine with FeatureTestBuilder for data**

**Example:**
```typescript
// src/renderer/widgets/Transfer/default/ui/__tests__/Amount.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';

import { formModel } from '../model/form-model';
import { Amount } from '../ui/Amount';

it('should show MAX button when balance exists', () => {
  const scope = fork({
    values: [
      [formModel.$available, new BN('10000000000000')],
      [formModel.$networkStore, { chain: polkadotChain, asset: dotAsset }],
    ],
  });

  render(
    <Provider value={scope}>
      <Amount />
    </Provider>
  );

  // Verify MAX button is visible
  const maxButton = screen.getByText('MAX');
  expect(maxButton).toBeInTheDocument();

  // Click MAX button
  fireEvent.click(maxButton);

  // Verify ED switch appears
  const edSwitch = screen.getByText(/existential deposit/i);
  expect(edSwitch).toBeInTheDocument();
});
```

**When to use:**
- ✅ Component rendering
- ✅ Conditional rendering
- ✅ User interactions (clicks, typing)
- ✅ UI state changes
- ✅ Accessibility testing

**Don't use for:**
- ❌ Business logic (use integration tests)
- ❌ Storage operations (use integration tests)
- ❌ Full user workflows (use E2E)

---

### Level 4: E2E Tests (Full Browser Workflows)

**What**: Complete user workflows in real browser
**Where**: `tests/system/tests/`
**Tools**: Playwright
**Already set up in your project**

**Example:**
```typescript
// tests/system/tests/transfers/vault.transfers.system.test.ts
test('user can transfer DOT with MAX button', async ({ page }) => {
  // Navigate to transfer page
  await page.goto('/assets');
  await page.click('[data-testid="transfer-button"]');

  // Select account
  await page.click('[data-testid="account-selector"]');
  await page.click('text=Sender Account');

  // Click MAX button
  await page.click('text=MAX');

  // Verify ED checkbox appears
  const edCheckbox = await page.locator('text=Existential Deposit');
  await expect(edCheckbox).toBeVisible();

  // Toggle ED
  await edCheckbox.click();

  // Submit transfer
  await page.click('text=Continue');
  
  // Verify success
  await expect(page.locator('text=Transfer successful')).toBeVisible();
});
```

**When to use:**
- ✅ Full user workflows
- ✅ Multi-page interactions
- ✅ UI/UX validation
- ✅ Cross-browser testing
- ✅ Visual regression
- ✅ Real network interactions

**Don't use for:**
- ❌ Business logic testing
- ❌ Edge cases (too slow)
- ❌ Storage testing
- ❌ Fast iteration

---

## Your Question: MAX Button → ED Checkbox

### Which Level?

**Integration Test** (Level 2) is the right choice because:

1. **You're testing MODEL logic**, not UI rendering
2. **Storage is involved** (balances, accounts)
3. **State changes** need verification ($showEDSwitch)
4. **Fast execution** for TDD

### Why Not Component Test?

Component tests would test that the UI *renders* the checkbox, but not the underlying business logic. You want to test:
- State changes when MAX is clicked
- Balance preservation logic
- Transaction building parameters

These are model concerns, not UI concerns.

### Why Not E2E?

E2E would work but is:
- Much slower
- More brittle
- Harder to debug
- Overkill for logic testing

E2E is better for testing the complete user flow: navigate → select → click → submit → verify success.

---

## Real Example: The Transfer Form Test

See `tests/integrations/tests/transfer-form-logic.integration.test.ts` for actual implementation.

### What It Tests (Correctly!)

```typescript
// ✅ Good: Testing actual feature logic
it('should show ED checkbox when MAX button is clicked', async () => {
  const env = await new FeatureTestBuilder()
    .withBalance(senderBalance) // Real balance from storage
    .build();

  // Test MODEL behavior
  await env.executeEvent(formModel.events.toggleMaxMode, true);
  expect(env.getState(formModel.$showEDSwitch)).toBe(true); // ✅ Tests logic
});

// ✅ Good: Testing state management with storage
it('should validate amount against actual balance', async () => {
  const env = await new FeatureTestBuilder()
    .withBalance({ total: '5000000000' }) // Specific balance
    .build();

  await allSettled(formModel.form.fields.amount.onChange, {
    scope: env.scope,
    params: '100', // More than balance
  });

  expect(env.getState(formModel.$canSubmit)).toBe(false); // ✅ Tests validation
});
```

### What NOT to Test (Wrong Level)

```typescript
// ❌ Bad: Testing UI rendering (use component test instead)
it('should render MAX button', () => {
  const { getByText } = render(<Amount />);
  expect(getByText('MAX')).toBeInTheDocument();
});

// ❌ Bad: Just verifying mock data (not testing anything)
it('should have balance', async () => {
  const env = await new FeatureTestBuilder()
    .withBalance(mockBalance)
    .build();
  
  const balances = await env.getStorageData('balances2');
  expect(balances[0]).toEqual(mockBalance); // ❌ Just checking mock
});
```

---

## Complete Testing Strategy

### For Transfer Feature

| Aspect | Test Level | Example |
|--------|-----------|---------|
| MAX button appears | E2E | Playwright: `await expect(page.locator('text=MAX')).toBeVisible()` |
| MAX button click → ED shows | **Integration** | `expect(env.getState($showEDSwitch)).toBe(true)` |
| ED checkbox renders | Component | `expect(screen.getByRole('checkbox')).toBeInTheDocument()` |
| ED toggle → balance preservation | **Integration** | `expect(env.getState($balancePreservation)).toBe('allowDeath')` |
| Amount calculation | Unit | `expect(calculateMaxAmount(balance, fee)).toBe(expected)` |
| Balance validation | **Integration** | `expect(env.getState($canSubmit)).toBe(false)` |
| Transaction building | **Integration** | `expect(env.getState($coreTx)?.type).toBe(TRANSFER)` |
| Full transfer flow | E2E | User clicks through entire process |

### Recommended Split

- **70%** Integration Tests (model logic, validation, storage)
- **20%** Component Tests (complex UI components)
- **10%** E2E Tests (critical user flows)

---

## Testing Pyramid

```
        /\
       /  \     E2E Tests (Slow, Comprehensive)
      /    \    - Full user workflows
     /------\   - Multi-page flows
    /        \  
   / Component\ Component Tests (Medium Speed)
  /   Tests   \ - React rendering
 /____________\ - User interactions
/              \
/ Integration   \ Integration Tests (Fast, Focused)
/     Tests      \ - Feature logic
/_________________\ - Storage + State
                   
     Unit Tests (Fastest)
     - Pure functions
     - Utilities
```

---

## Comparison Table

| | Unit | Integration | Component | E2E |
|---|------|-------------|-----------|-----|
| **Speed** | ⚡⚡⚡⚡⚡ | ⚡⚡⚡⚡ | ⚡⚡⚡ | ⚡ |
| **Isolation** | ✅ Complete | ✅ Good | ⚠️ Partial | ❌ None |
| **Realism** | ❌ Low | ✅ High | ✅ High | ✅ Very High |
| **Debugging** | ✅ Easy | ✅ Easy | ⚠️ Medium | ❌ Hard |
| **Maintenance** | ✅ Low | ✅ Medium | ⚠️ Medium | ❌ High |
| **Coverage** | 📊 Narrow | 📊 Medium | 📊 Medium | 📊 Wide |

---

## When to Add Each Type

### Always Write

1. **Integration Tests** for:
   - Every feature with storage
   - Business logic
   - Validation rules
   - State management

### Sometimes Write

2. **Component Tests** for:
   - Complex components
   - Conditional rendering
   - Form validation UI
   - Custom hooks

3. **E2E Tests** for:
   - Critical user paths
   - Multi-step workflows
   - Regression prevention

### Rarely Write

4. **Unit Tests** only when:
   - Complex pure functions
   - Shared utilities
   - Not already covered by integration tests

---

## Real-World Example: Testing Transfer Feature

### ✅ Integration Test (THIS FRAMEWORK)

**File**: `tests/integrations/tests/transfer-form-logic.integration.test.ts`

```typescript
it('should show ED checkbox when MAX is clicked', async () => {
  const env = await new FeatureTestBuilder()
    .withWallet(vaultWallet)
    .withAccount(senderAccount)
    .withBalance(senderBalance)
    .withChain(polkadotChain)
    .build();

  // Test actual feature model logic
  await env.executeEvent(formModel.formInitiated, {
    chain: polkadotChain,
    asset: dotAsset,
  });

  // Before MAX click
  expect(env.getState(formModel.$showEDSwitch)).toBe(false);

  // Click MAX
  await env.executeEvent(formModel.events.toggleMaxMode, true);

  // After MAX click - ED checkbox should appear
  expect(env.getState(formModel.$showEDSwitch)).toBe(true);
  expect(env.getState(formModel.$isMaxModeEnabled)).toBe(true);

  await env.cleanup();
});
```

**What it tests:**
- ✅ Feature model state changes
- ✅ Event handling logic
- ✅ Store computations
- ✅ Integration with storage (balances loaded correctly)

**What it doesn't test:**
- ❌ UI rendering
- ❌ Button click events (DOM)
- ❌ Styles/appearance

### ✅ Component Test (if needed)

**File**: `src/renderer/widgets/Transfer/default/ui/__tests__/Amount.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { BN } from '@polkadot/util';

it('should render MAX button and ED checkbox', () => {
  const scope = fork({
    values: [
      [formModel.$available, new BN('10000000000000')],
      [formModel.$showEDSwitch, true],
      [formModel.$isExistentialDepositEnabled, false],
      [formModel.$networkStore, { chain: polkadotChain, asset: dotAsset }],
    ],
  });

  render(
    <Provider value={scope}>
      <Amount />
    </Provider>
  );

  // Test rendering
  const maxButton = screen.getByText('MAX');
  expect(maxButton).toBeInTheDocument();

  const edCheckbox = screen.getByRole('checkbox');
  expect(edCheckbox).toBeInTheDocument();
  expect(edCheckbox).not.toBeChecked();

  // Test interaction
  fireEvent.click(edCheckbox);
  // Would need to verify state change via callback or store
});
```

**What it tests:**
- ✅ Component renders with correct props
- ✅ Conditional rendering (MAX button visibility)
- ✅ DOM structure
- ✅ Basic interactions

### ✅ E2E Test (Playwright)

**File**: `tests/system/tests/transfers/max-button.system.test.ts`

```typescript
test('user can use MAX button with ED toggle', async ({ page }) => {
  await page.goto('/assets');
  
  // Select DOT
  await page.click('[data-testid="dot-transfer-button"]');
  
  // Select sender account
  await page.click('[data-testid="account-selector"]');
  await page.click('text=Sender Account');
  
  // Enter destination
  await page.fill('[data-testid="destination-input"]', recipientAddress);
  
  // Click MAX button
  await page.click('text=MAX');
  
  // Verify ED checkbox appears
  await expect(page.locator('text=Existential Deposit')).toBeVisible();
  
  // Toggle ED
  await page.click('[data-testid="ed-checkbox"]');
  
  // Verify amount filled with max value
  const amountInput = page.locator('[data-testid="amount-input"]');
  const amount = await amountInput.inputValue();
  expect(parseFloat(amount)).toBeGreaterThan(0);
  
  // Continue and verify
  await page.click('text=Continue');
  await expect(page.locator('text=Confirm Transfer')).toBeVisible();
});
```

**What it tests:**
- ✅ Full user workflow
- ✅ Real UI interactions
- ✅ Visual feedback
- ✅ Navigation between screens
- ✅ End-to-end behavior

---

## Common Mistakes

### ❌ Wrong: Testing UI in Integration Tests

```typescript
// DON'T DO THIS in integration tests
it('should render button', () => {
  render(<TransferForm />); // ❌ Wrong level
  expect(screen.getByText('MAX')).toBeInTheDocument();
});
```

### ✅ Right: Test Logic in Integration Tests

```typescript
// DO THIS in integration tests
it('should enable MAX mode when event fires', async () => {
  const env = await new FeatureTestBuilder().build();
  await env.executeEvent(formModel.events.toggleMaxMode, true);
  expect(env.getState(formModel.$isMaxModeEnabled)).toBe(true); // ✅ Right level
  await env.cleanup();
});
```

### ❌ Wrong: Testing Pure Logic in Integration Tests

```typescript
// DON'T DO THIS
it('should format balance', async () => {
  const env = await new FeatureTestBuilder().build(); // ❌ Unnecessary
  const formatted = formatBalance('1000', 10);
  expect(formatted).toBe('0.0001');
  await env.cleanup();
});
```

### ✅ Right: Pure Logic in Unit Tests

```typescript
// DO THIS
it('should format balance', () => {
  const formatted = formatBalance('1000', 10); // ✅ Simple unit test
  expect(formatted).toBe('0.0001');
});
```

---

## Summary: What to Test Where

### Integration Tests (THIS FRAMEWORK)

**Perfect for:**
```typescript
// ✅ Feature logic with storage
it('should persist transaction to basket', async () => {
  await env.executeEvent(basketModel.addTransaction, tx);
  await env.verifyInStorage('basketTransactions', txs => txs.length === 1);
});

// ✅ State changes from events
it('should update form state', async () => {
  await env.executeEvent(formModel.events.toggleMaxMode, true);
  expect(env.getState(formModel.$isMaxModeEnabled)).toBe(true);
});

// ✅ Validation with real data
it('should validate against actual balance', async () => {
  await allSettled(formModel.form.fields.amount.onChange, {
    scope: env.scope,
    params: '1000000',
  });
  expect(env.getState(formModel.$canSubmit)).toBe(false);
});
```

### NOT for Integration Tests

```typescript
// ❌ UI rendering (use component tests)
expect(screen.getByText('MAX')).toBeInTheDocument();

// ❌ Pure calculations (use unit tests)
expect(formatAmount('100', 10)).toBe('0.0000000100');

// ❌ Full user flows (use E2E)
await page.click('button');
await page.waitForNavigation();
```

---

## See Also

- [Quick Start Guide](./QUICK_START.md)
- [Integration Testing Guide](./INTEGRATION_TESTING_GUIDE.md)
- [Transfer Form Example](../tests/transfer-form-logic.integration.test.ts)

---

**Remember**: Integration tests test **business logic and state management**, not UI rendering!

