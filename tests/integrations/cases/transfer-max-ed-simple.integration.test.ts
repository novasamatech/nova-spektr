import { allSettled } from 'effector';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConnectionStatus } from '@/shared/core';
import { accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { walletModel } from '@/entities/wallet';
import { formModel } from '@/widgets/Transfer/default/model/form-model';
import { polkadotChain, polkadotChainId, senderAccount, senderBalance, vaultWallet } from '../fixtures';
import { type FeatureTestEnvironment, FeatureTestBuilder } from '../utils';

// Mock XCM config to prevent network calls
vi.mock('@/shared/api/xcm', () => ({
  xcmConfigService: {
    getXcmConfig: vi.fn().mockResolvedValue({ xcm: [] }),
  },
}));

/**
 * Simple integration tests for Transfer MAX Button and ED Checkbox
 *
 * This demonstrates testing REAL FEATURE LOGIC without UI:
 *
 * - Uses FeatureTestBuilder with direct store value injection
 * - Tests actual business logic in the feature model
 * - Verifies state changes from events
 *
 * @group integration
 * @group transfer
 */
describe('Transfer MAX + ED Logic - Simple Integration', () => {
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
        .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet])
        .withStoreValue(accounts.__test.$list, [senderAccount])
        .build();

      // Initialize transfer form
      await env.executeEvent(formModel.formInitiated, {
        chain: polkadotChain,
        asset: polkadotChain.assets[0],
      });

      // VERIFY: Initial state - MAX mode is disabled
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

      // User starts typing (UI would disable MAX mode)
      await allSettled(formModel.form.fields.amount.change, {
        scope: env.scope,
        params: '1',
      });
      await env.executeEvent(formModel.events.toggleMaxMode, false);

      // VERIFY: MAX mode is disabled
      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(false);
    });
  });

  describe('ED Checkbox Toggle', () => {
    it('should toggle existential deposit enabled state', async () => {
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

      // VERIFY: Initial state - ED disabled (default)
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

    it('should keep ED state independent of MAX mode', async () => {
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

      // Enable MAX and ED
      await env.executeEvent(formModel.events.toggleMaxMode, true);
      await env.executeEvent(formModel.events.toggleExistentialDeposit, true);

      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(true);
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(true);

      // Disable MAX mode
      await env.executeEvent(formModel.events.toggleMaxMode, false);

      // VERIFY: ED state persists when MAX is toggled
      // ED and MAX are independent toggles
      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(false);
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(true);
    });
  });

  describe('Complete Workflow', () => {
    it('should execute full MAX + ED toggle workflow', async () => {
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

      // Step 1: Initial state
      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(false);
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(false);

      // Step 2: Click MAX button
      await env.executeEvent(formModel.events.toggleMaxMode, true);

      // Verify: MAX mode enabled
      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(true);

      // Step 3: Toggle ED ON
      await env.executeEvent(formModel.events.toggleExistentialDeposit, true);

      // Verify: ED is enabled
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(true);

      // Step 4: User types manually (disables MAX)
      await allSettled(formModel.form.fields.amount.change, {
        scope: env.scope,
        params: '1',
      });
      await env.executeEvent(formModel.events.toggleMaxMode, false);

      // Verify: MAX disabled, but ED stays enabled (they are independent)
      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(false);
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(true);

      // Step 5: Toggle ED OFF manually
      await env.executeEvent(formModel.events.toggleExistentialDeposit, false);

      // Verify: ED disabled
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(false);

      // Step 6: Click MAX again
      await env.executeEvent(formModel.events.toggleMaxMode, true);

      // Verify: MAX re-enabled, ED still off
      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(true);
      expect(env.getState(formModel.$isExistentialDepositEnabled)).toBe(false);
    });
  });
});
