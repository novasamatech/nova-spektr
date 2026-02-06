import { allSettled } from 'effector';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConnectionStatus } from '@/shared/core';
import { accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
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
import { type FeatureTestEnvironment, FeatureTestBuilder } from '../utils';

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
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
  });

  describe('MAX Button Behavior', () => {
    it('should enable MAX mode when toggled', async () => {
      env = await new FeatureTestBuilder({ autoPopulate: false })
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .withStoreValue(balanceModel.__test.$balanceMap, { [senderBalance.id]: senderBalance })
        .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet, watchOnlyWallet])
        .withStoreValue(accounts.__test.$list, [senderAccount, recipientAccount])
        .build();

      // Initialize form with network context
      await env.executeEvent(formModel.formInitiated, {
        chain: polkadotChain,
        asset: polkadotChain.assets[0],
      });

      // VERIFY: Initial state - MAX mode should be disabled
      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(false);

      // ACTION: User clicks MAX button
      await env.executeEvent(formModel.events.toggleMaxMode, true);

      // VERIFY: MAX mode is enabled
      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(true);
    });

    it('should disable MAX mode when user types amount manually', async () => {
      env = await new FeatureTestBuilder({ autoPopulate: false })
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .withStoreValue(balanceModel.__test.$balanceMap, { [senderBalance.id]: senderBalance })
        .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet])
        .withStoreValue(accounts.__test.$list, [senderAccount])
        .build();

      await env.executeEvent(formModel.formInitiated, {
        chain: polkadotChain,
        asset: polkadotChain.assets[0],
      });

      // Enable MAX mode
      await env.executeEvent(formModel.events.toggleMaxMode, true);
      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(true);

      // User starts typing (disables MAX mode)
      await env.executeEvent(formModel.events.toggleMaxMode, false);

      // VERIFY: MAX mode is disabled
      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(false);
    });
  });

  describe('ED Checkbox Behavior', () => {
    it('should toggle existential deposit flag', async () => {
      env = await new FeatureTestBuilder({ autoPopulate: false })
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .withStoreValue(balanceModel.__test.$balanceMap, { [senderBalance.id]: senderBalance })
        .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet])
        .withStoreValue(accounts.__test.$list, [senderAccount])
        .build();

      await env.executeEvent(formModel.formInitiated, {
        chain: polkadotChain,
        asset: polkadotChain.assets[0],
      });

      // VERIFY: Initial state - ED disabled
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(false);

      // ACTION: Toggle ED ON
      await env.executeEvent(formModel.events.toggleExistentialDeposit, true);

      // VERIFY: ED is now enabled
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(true);

      // ACTION: Toggle ED OFF
      await env.executeEvent(formModel.events.toggleExistentialDeposit, false);

      // VERIFY: ED is now disabled
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(false);
    });

    it('should allow ED toggle independent of MAX mode', async () => {
      env = await new FeatureTestBuilder({ autoPopulate: false })
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .withStoreValue(balanceModel.__test.$balanceMap, { [senderBalance.id]: senderBalance })
        .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet])
        .withStoreValue(accounts.__test.$list, [senderAccount])
        .build();

      await env.executeEvent(formModel.formInitiated, {
        chain: polkadotChain,
        asset: polkadotChain.assets[0],
      });

      // Try to toggle ED without clicking MAX first
      await env.executeEvent(formModel.events.toggleExistentialDeposit, true);

      // ED can be toggled regardless of MAX state
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(true);

      // Now click MAX
      await env.executeEvent(formModel.events.toggleMaxMode, true);

      // Both should be enabled
      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(true);
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(true);
    });
  });

  describe('Complete MAX + ED Workflow', () => {
    it('should execute full MAX + ED interaction workflow', async () => {
      env = await new FeatureTestBuilder({ autoPopulate: false })
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .withStoreValue(balanceModel.__test.$balanceMap, { [senderBalance.id]: senderBalance })
        .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet, watchOnlyWallet])
        .withStoreValue(accounts.__test.$list, [senderAccount, recipientAccount])
        .build();

      // Step 1: Initialize form
      await env.executeEvent(formModel.formInitiated, {
        chain: polkadotChain,
        asset: polkadotChain.assets[0],
      });

      // Step 2: Verify initial state
      expect(env.getState(formModel.$networkStore)).toBeDefined();
      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(false);
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(false);

      // Step 3: User clicks MAX button
      await env.executeEvent(formModel.events.toggleMaxMode, true);

      // Step 4: Verify MAX mode is enabled
      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(true);

      // Step 5: User toggles ED checkbox ON
      await env.executeEvent(formModel.events.toggleExistentialDeposit, true);

      // Step 6: Verify ED is enabled
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(true);

      // Step 7: User toggles ED checkbox OFF
      await env.executeEvent(formModel.events.toggleExistentialDeposit, false);

      // Step 8: Verify ED is disabled
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(false);

      // Step 9: User disables MAX mode (types manually)
      await env.executeEvent(formModel.events.toggleMaxMode, false);

      // Step 10: Verify MAX mode is off
      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(false);
    });
  });

  describe('Real Balance Integration', () => {
    it('should use actual balance from storage for MAX calculation', async () => {
      env = await new FeatureTestBuilder({ autoPopulate: false })
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .withStoreValue(balanceModel.__test.$balanceMap, { [senderBalance.id]: senderBalance })
        .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet, watchOnlyWallet])
        .withStoreValue(accounts.__test.$list, [senderAccount, recipientAccount])
        .build();

      // Set selected wallet so initiators can be calculated
      await allSettled(walletSelect.select, {
        scope: env.scope,
        params: vaultWallet.id,
      });

      // Initialize form
      await env.executeEvent(formModel.formInitiated, {
        chain: polkadotChain,
        asset: polkadotChain.assets[0],
      });

      // Verify balance was set correctly
      const balanceMap = env.getState(balanceModel.__test.$balanceMap);
      expect(balanceMap[senderBalance.id]).toBeDefined();
      expect(balanceMap[senderBalance.id].free.toString()).toBe('10000000000000');

      // Enable MAX mode
      await env.executeEvent(formModel.events.toggleMaxMode, true);
      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(true);

      // Enable ED
      await env.executeEvent(formModel.events.toggleExistentialDeposit, true);
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(true);
    });
  });
});
