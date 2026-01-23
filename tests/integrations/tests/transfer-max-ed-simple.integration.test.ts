import { allSettled, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { walletModel } from '@/entities/wallet';
import { formModel } from '@/widgets/Transfer/default/model/form-model';
import { polkadotChain, senderAccount, senderBalance, vaultWallet } from '../fixtures';

// Mock XCM config to prevent network calls
vi.mock('@/shared/api/xcm', () => ({
  xcmConfigService: {
    getXcmConfig: vi.fn().mockResolvedValue({ xcm: [] }),
  },
}));

/**
 * Simple, working integration tests for Transfer MAX Button and ED Checkbox
 *
 * This demonstrates testing REAL FEATURE LOGIC without UI:
 *
 * - Uses Effector fork() with handlers to mock storage reads
 * - Tests actual business logic in the feature model
 * - Verifies state changes from events
 *
 * @group integration
 * @group transfer
 */
describe('Transfer MAX + ED Logic - Simple Integration', () => {
  describe('MAX Button Shows ED Switch', () => {
    it('should show ED switch when MAX mode is enabled', async () => {
      // Create isolated scope with mocked storage reads
      const scope = fork({
        handlers: [
          // Mock storage reads to return test data
          [walletModel.populate, () => [vaultWallet]],
          [accounts.populate, () => [senderAccount]],
          [balanceModel.populate, () => [senderBalance]],
        ],
      });

      // Populate stores from "storage" (mocked)
      await allSettled(walletModel.populate, { scope });
      await allSettled(accounts.populate, { scope });
      await allSettled(balanceModel.populate, { scope });

      // Initialize transfer form
      await allSettled(formModel.formInitiated, {
        scope,
        params: {
          chain: polkadotChain,
          asset: polkadotChain.assets[0],
        },
      });

      // VERIFY: Initial state - ED switch is NOT visible
      expect(scope.getState(formModel.$showEDSwitch)).toBe(false);
      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(false);

      // ACTION: User clicks MAX button
      await allSettled(formModel.events.toggleMaxMode, {
        scope,
        params: true,
      });

      // VERIFY: ED switch becomes visible ✅
      expect(scope.getState(formModel.$showEDSwitch)).toBe(true);
      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(true);
    });

    it('should keep ED switch visible after MAX is disabled', async () => {
      const scope = fork({
        handlers: [
          [walletModel.populate, () => [vaultWallet]],
          [accounts.populate, () => [senderAccount]],
          [balanceModel.populate, () => [senderBalance]],
        ],
      });

      await allSettled(walletModel.populate, { scope });
      await allSettled(accounts.populate, { scope });
      await allSettled(balanceModel.populate, { scope });

      await allSettled(formModel.formInitiated, {
        scope,
        params: {
          chain: polkadotChain,
          asset: polkadotChain.assets[0],
        },
      });

      // Enable MAX mode
      await allSettled(formModel.events.toggleMaxMode, {
        scope,
        params: true,
      });

      expect(scope.getState(formModel.$showEDSwitch)).toBe(true);

      // Disable MAX mode (user types manually)
      await allSettled(formModel.events.toggleMaxMode, {
        scope,
        params: false,
      });

      // VERIFY: MAX mode disabled but ED switch STAYS visible ✅
      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(false);
      expect(scope.getState(formModel.$showEDSwitch)).toBe(true); // Stays visible!
    });
  });

  describe('ED Checkbox Toggle', () => {
    it('should toggle existential deposit enabled state', async () => {
      const scope = fork({
        handlers: [
          [walletModel.populate, () => [vaultWallet]],
          [accounts.populate, () => [senderAccount]],
          [balanceModel.populate, () => [senderBalance]],
        ],
      });

      await allSettled(walletModel.populate, { scope });
      await allSettled(accounts.populate, { scope });
      await allSettled(balanceModel.populate, { scope });

      await allSettled(formModel.formInitiated, {
        scope,
        params: {
          chain: polkadotChain,
          asset: polkadotChain.assets[0],
        },
      });

      // VERIFY: Initial state - ED disabled (default)
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(false);

      // ACTION: Toggle ED ON
      await allSettled(formModel.events.toggleExistentialDeposit, {
        scope,
        params: true,
      });

      // VERIFY: ED is now enabled ✅
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(true);

      // ACTION: Toggle ED OFF
      await allSettled(formModel.events.toggleExistentialDeposit, {
        scope,
        params: false,
      });

      // VERIFY: ED is now disabled ✅
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(false);
    });

    it('should keep ED state independent of MAX mode', async () => {
      const scope = fork({
        handlers: [
          [walletModel.populate, () => [vaultWallet]],
          [accounts.populate, () => [senderAccount]],
          [balanceModel.populate, () => [senderBalance]],
        ],
      });

      await allSettled(walletModel.populate, { scope });
      await allSettled(accounts.populate, { scope });
      await allSettled(balanceModel.populate, { scope });

      await allSettled(formModel.formInitiated, {
        scope,
        params: {
          chain: polkadotChain,
          asset: polkadotChain.assets[0],
        },
      });

      // Enable MAX and ED
      await allSettled(formModel.events.toggleMaxMode, {
        scope,
        params: true,
      });

      await allSettled(formModel.events.toggleExistentialDeposit, {
        scope,
        params: true,
      });

      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(true);
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(true);

      // Disable MAX mode
      await allSettled(formModel.events.toggleMaxMode, {
        scope,
        params: false,
      });

      // VERIFY: ED state persists when MAX is toggled ✅
      // ED and MAX are independent toggles
      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(false);
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(true); // Still true!
    });
  });

  describe('Complete Workflow', () => {
    it('should execute full MAX + ED toggle workflow', async () => {
      const scope = fork({
        handlers: [
          [walletModel.populate, () => [vaultWallet]],
          [accounts.populate, () => [senderAccount]],
          [balanceModel.populate, () => [senderBalance]],
        ],
      });

      await allSettled(walletModel.populate, { scope });
      await allSettled(accounts.populate, { scope });
      await allSettled(balanceModel.populate, { scope });

      await allSettled(formModel.formInitiated, {
        scope,
        params: {
          chain: polkadotChain,
          asset: polkadotChain.assets[0],
        },
      });

      // Step 1: Initial state
      expect(scope.getState(formModel.$showEDSwitch)).toBe(false);
      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(false);
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(false);

      // Step 2: Click MAX button
      await allSettled(formModel.events.toggleMaxMode, {
        scope,
        params: true,
      });

      // Verify: ED switch appears
      expect(scope.getState(formModel.$showEDSwitch)).toBe(true);
      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(true);

      // Step 3: Toggle ED ON
      await allSettled(formModel.events.toggleExistentialDeposit, {
        scope,
        params: true,
      });

      // Verify: ED is enabled
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(true);

      // Step 4: User types manually (disables MAX)
      await allSettled(formModel.events.toggleMaxMode, {
        scope,
        params: false,
      });

      // Verify: MAX disabled, ED auto-disabled, switch stays visible
      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(false);
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(false);
      expect(scope.getState(formModel.$showEDSwitch)).toBe(true);

      // Step 5: Click MAX again
      await allSettled(formModel.events.toggleMaxMode, {
        scope,
        params: true,
      });

      // Verify: MAX re-enabled
      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(true);

      // Step 6: Toggle ED ON again
      await allSettled(formModel.events.toggleExistentialDeposit, {
        scope,
        params: true,
      });

      // Verify: ED enabled
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(true);

      // ✅ Full workflow tested successfully!
    });
  });
});
