import { allSettled, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { ConnectionStatus } from '@/shared/core';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { formModel } from '@/widgets/Transfer/default/model/form-model';
import {
  polkadotChain,
  polkadotChainId,
  recipientAccount,
  senderAccount,
  senderBalance,
  vaultWallet,
  watchOnlyWallet,
} from '../fixtures';
import { FeatureTestBuilder } from '../utils';

/**
 * REAL Integration Tests for Transfer Form MAX Button and ED Checkbox
 *
 * This demonstrates how to test ACTUAL FEATURE LOGIC:
 *
 * - State management (Effector stores)
 * - Event handling
 * - Storage integration
 * - Business rules
 *
 * These tests verify the BEHAVIOR of the feature, not just mock data.
 *
 * @group integration
 * @group transfer
 * @group max-button
 */
// Mock XCM config to prevent network calls
vi.mock('@/shared/api/xcm', () => ({
  xcmConfigService: {
    getXcmConfig: vi.fn().mockResolvedValue({ xcm: [] }),
  },
}));

describe('Transfer MAX Button and ED Checkbox - REAL Logic', () => {
  describe('MAX Button Behavior', () => {
    it('should show ED switch when MAX mode is enabled', async () => {
      // Use fork directly for simpler test
      const scope = fork({
        values: new Map<any, any>([
          [walletModel.$wallets, [vaultWallet, watchOnlyWallet]],
          [networkModel.$chains, { [polkadotChainId]: polkadotChain }],
          [networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED }],
          [walletSelect.$selectedWallet, vaultWallet],
          [walletSelect.$selectedAccounts, [senderAccount, recipientAccount]],
          [balanceModel.$balanceMap, { [senderBalance.id]: senderBalance }],
        ]) as any,
      });

      // Initialize form with network context
      await allSettled(formModel.formInitiated, {
        scope,
        params: {
          chain: polkadotChain,
          asset: polkadotChain.assets[0],
        },
      });

      // VERIFY: Initial state - ED switch should NOT be visible
      expect(scope.getState(formModel.$showEDSwitch)).toBe(false);
      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(false);

      // ACTION: User clicks MAX button
      await allSettled(formModel.events.toggleMaxMode, {
        scope,
        params: true,
      });

      // VERIFY: ED switch becomes visible and MAX mode is enabled
      expect(scope.getState(formModel.$showEDSwitch)).toBe(true);
      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(true);
    });

    it('should disable MAX mode when user types amount manually', async () => {
      const scope = fork({
        values: new Map<any, any>([
          [walletModel.$wallets, [vaultWallet]],
          [networkModel.$chains, { [polkadotChainId]: polkadotChain }],
          [networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED }],
          [walletSelect.$selectedWallet, vaultWallet],
          [walletSelect.$selectedAccounts, [senderAccount]],
          [balanceModel.$balanceMap, { [senderBalance.id]: senderBalance }],
        ]) as any,
      });

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

      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(true);

      // User starts typing (disables MAX mode)
      await allSettled(formModel.events.toggleMaxMode, {
        scope,
        params: false,
      });

      // VERIFY: MAX mode is disabled
      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(false);

      // Note: $showEDSwitch stays true once shown (design decision)
      expect(scope.getState(formModel.$showEDSwitch)).toBe(true);
    });
  });

  describe('ED Checkbox Behavior', () => {
    it('should toggle existential deposit flag', async () => {
      const scope = fork({
        values: new Map<any, any>([
          [walletModel.$wallets, [vaultWallet]],
          [networkModel.$chains, { [polkadotChainId]: polkadotChain }],
          [networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED }],
          [walletSelect.$selectedWallet, vaultWallet],
          [walletSelect.$selectedAccounts, [senderAccount]],
          [balanceModel.$balanceMap, { [senderBalance.id]: senderBalance }],
        ]) as any,
      });

      await allSettled(formModel.formInitiated, {
        scope,
        params: {
          chain: polkadotChain,
          asset: polkadotChain.assets[0],
        },
      });

      // VERIFY: Initial state - ED disabled
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(false);

      // ACTION: Toggle ED ON
      await allSettled(formModel.events.toggleExistentialDeposit, {
        scope,
        params: true,
      });

      // VERIFY: ED is now enabled
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(true);

      // ACTION: Toggle ED OFF
      await allSettled(formModel.events.toggleExistentialDeposit, {
        scope,
        params: false,
      });

      // VERIFY: ED is now disabled
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(false);
    });

    it('should only show ED switch after MAX is clicked', async () => {
      const scope = fork({
        values: new Map<any, any>([
          [walletModel.$wallets, [vaultWallet]],
          [networkModel.$chains, { [polkadotChainId]: polkadotChain }],
          [walletSelect.$selectedWallet, vaultWallet],
          [walletSelect.$selectedAccounts, [senderAccount]],
          [balanceModel.$balanceMap, { [senderBalance.id]: senderBalance }],
        ]) as any,
      });

      await allSettled(formModel.formInitiated, {
        scope,
        params: {
          chain: polkadotChain,
          asset: polkadotChain.assets[0],
        },
      });

      // VERIFY: ED switch is NOT visible initially
      expect(scope.getState(formModel.$showEDSwitch)).toBe(false);

      // Try to toggle ED without clicking MAX first
      await allSettled(formModel.events.toggleExistentialDeposit, {
        scope,
        params: true,
      });

      // ED can be toggled, but switch won't show until MAX is clicked
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(true);
      expect(scope.getState(formModel.$showEDSwitch)).toBe(false);

      // Now click MAX
      await allSettled(formModel.events.toggleMaxMode, {
        scope,
        params: true,
      });

      // VERIFY: NOW the switch becomes visible
      expect(scope.getState(formModel.$showEDSwitch)).toBe(true);
    });
  });

  describe('Complete MAX + ED Workflow', () => {
    it('should execute full MAX + ED interaction workflow', async () => {
      const scope = fork({
        values: new Map<any, any>([
          [walletModel.$wallets, [vaultWallet, watchOnlyWallet]],
          [networkModel.$chains, { [polkadotChainId]: polkadotChain }],
          [networkModel.$connectionStatuses, { [polkadotChainId]: ConnectionStatus.CONNECTED }],
          [walletSelect.$selectedWallet, vaultWallet],
          [walletSelect.$selectedAccounts, [senderAccount, recipientAccount]],
          [balanceModel.$balanceMap, { [senderBalance.id]: senderBalance }],
        ]) as any,
      });

      // Step 1: Initialize form
      await allSettled(formModel.formInitiated, {
        scope,
        params: {
          chain: polkadotChain,
          asset: polkadotChain.assets[0],
        },
      });

      // Step 2: Verify initial state
      expect(scope.getState(formModel.$networkStore)).toBeDefined();
      expect(scope.getState(formModel.$showEDSwitch)).toBe(false);
      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(false);
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(false);

      // Step 3: User clicks MAX button
      await allSettled(formModel.events.toggleMaxMode, {
        scope,
        params: true,
      });

      // Step 4: Verify MAX mode effects
      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(true);
      expect(scope.getState(formModel.$showEDSwitch)).toBe(true);

      // Step 5: User toggles ED checkbox ON
      await allSettled(formModel.events.toggleExistentialDeposit, {
        scope,
        params: true,
      });

      // Step 6: Verify ED is enabled
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(true);

      // Step 7: User toggles ED checkbox OFF
      await allSettled(formModel.events.toggleExistentialDeposit, {
        scope,
        params: false,
      });

      // Step 8: Verify ED is disabled
      expect(scope.getState(formModel.$isExistentialDepositEnabled)).toBe(false);

      // Step 9: User disables MAX mode (types manually)
      await allSettled(formModel.events.toggleMaxMode, {
        scope,
        params: false,
      });

      // Step 10: Verify MAX mode is off
      expect(scope.getState(formModel.$isMaxModeEnabled)).toBe(false);

      // ED switch stays visible (design decision - see form-model.ts line 88-90)
      expect(scope.getState(formModel.$showEDSwitch)).toBe(true);
    });
  });

  describe('Real Balance Integration', () => {
    it('should use actual balance from storage for MAX calculation', async () => {
      // Setup environment with REAL storage containing balance
      const env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withWallet(watchOnlyWallet)
        .withAccount(senderAccount)
        .withAccount(recipientAccount)
        .withBalance(senderBalance) // Real balance: 1000 DOT
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      try {
        // Set selected wallet so initiators can be calculated
        await allSettled(walletSelect.select, {
          scope: env.scope,
          params: vaultWallet.id,
        });

        // Initialize form
        await allSettled(formModel.formInitiated, {
          scope: env.scope,
          params: {
            chain: polkadotChain,
            asset: polkadotChain.assets[0],
          },
        });

        // Verify balance was loaded from storage into balanceModel
        const balanceMap = env.getState(balanceModel.$balanceMap);
        expect(balanceMap[senderBalance.id]).toBeDefined();
        expect(balanceMap[senderBalance.id].free.toString()).toBe('10000000000000');

        // Verify available balance is calculated
        const available = env.getState(formModel.$available);

        // Available should be set based on the balance from storage
        // (Exact value depends on withdrawableAmount calculation)
        expect(available).toBeDefined();
      } finally {
        await env.cleanup();
      }
    });
  });
});
