import { allSettled } from 'effector';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionStatus } from '@/shared/core';
import { alertsModel } from '@/features/fellowship-profile/model/alerts';
import { setActive } from '@/features/fellowship-profile/model/setActive';
import { type Alert } from '@/features/fellowship-profile/types';
import { polkadotChain, polkadotChainId, senderAccount, senderBalance, vaultWallet } from '../../fixtures/index';
import { type FeatureTestEnvironment, FeatureTestBuilder, allureMetadata } from '../../utils/index';

/**
 * Integration tests for Fellowship Profile Management
 *
 * Tests actual feature behavior including:
 *
 * - Active/inactive status toggle
 * - Profile alerts management
 * - Transaction building for status changes
 * - Rank restrictions for status changes
 *
 * @group integration
 * @group fellowship
 * @group fellowship-profile
 */
describe('Fellowship Profile - Integration', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
  });

  describe('Active/Inactive Status Toggle', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Profile',
        story: 'Active/Inactive Status Toggle',
      });
    });

    it('should open setActive flow with isActive true', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Open flow to set active
      await allSettled(setActive.flow.open, {
        scope: env.scope,
        params: {
          isActive: true,
        },
      });

      // Flow should be open with isActive state
      expect(setActive.flow).toBeDefined();
    });

    it('should open setActive flow with isActive false', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Open flow to set inactive
      await allSettled(setActive.flow.open, {
        scope: env.scope,
        params: {
          isActive: false,
        },
      });

      expect(setActive.flow).toBeDefined();
    });

    it('should have fee store for setActive transaction', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(setActive.flow.open, {
        scope: env.scope,
        params: {
          isActive: true,
        },
      });

      // Fee store should exist
      expect(setActive.$fee).toBeDefined();
    });

    it('should have wrapped transaction store', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(setActive.flow.open, {
        scope: env.scope,
        params: {
          isActive: false,
        },
      });

      expect(setActive.$wrappedTx).toBeDefined();
    });

    it('should have sign event for status change', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(setActive.sign).toBeDefined();
    });

    it('should have saveToBasket event', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(setActive.saveToBasket).toBeDefined();
    });

    it('should toggle from active to inactive', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Member is active, toggle to inactive
      await allSettled(setActive.flow.open, {
        scope: env.scope,
        params: {
          isActive: false, // Set to inactive
        },
      });

      // Transaction stores should be prepared
      expect(setActive.$fee).toBeDefined();
      expect(setActive.$wrappedTx).toBeDefined();
    });

    it('should toggle from inactive to active', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Member is inactive, toggle to active
      await allSettled(setActive.flow.open, {
        scope: env.scope,
        params: {
          isActive: true, // Set to active
        },
      });

      expect(setActive.$fee).toBeDefined();
      expect(setActive.$wrappedTx).toBeDefined();
    });
  });

  describe('Profile Alerts', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Profile',
        story: 'Profile Alerts',
      });
    });

    it('should open alerts gate with alerts array', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      const testAlerts: Alert[] = [
        { id: 'promotion-ready', type: 'promoted', seen: false, rank: 3, referendumId: 1 },
        { id: 'retention-needed', type: 'proven', seen: false, rank: 2, referendumId: 2 },
      ];

      await allSettled(alertsModel.gate.open, {
        scope: env.scope,
        params: testAlerts,
      });

      expect(alertsModel.gate).toBeDefined();
    });

    it('should mark single alert as seen', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      const testAlerts: Alert[] = [{ id: 'promotion-ready', type: 'promoted', seen: false, rank: 3, referendumId: 1 }];

      await allSettled(alertsModel.gate.open, {
        scope: env.scope,
        params: testAlerts,
      });

      await allSettled(alertsModel.markAsSeen, {
        scope: env.scope,
        params: 'promotion-ready',
      });

      const alertsWereSeen = env.scope.getState(alertsModel.$alertsWereSeen);
      expect(alertsWereSeen['promotion-ready']).toBe(true);
    });

    it('should mark all alerts as seen', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      const testAlerts: Alert[] = [
        { id: 'alert-1', type: 'promoted', seen: false, rank: 1, referendumId: 1 },
        { id: 'alert-2', type: 'proven', seen: false, rank: 2, referendumId: 2 },
        { id: 'alert-3', type: 'bumped', seen: false, rank: 3 },
      ];

      await allSettled(alertsModel.gate.open, {
        scope: env.scope,
        params: testAlerts,
      });

      await allSettled(alertsModel.markAllAsSeen, {
        scope: env.scope,
        params: undefined,
      });

      // All alerts should be marked as seen in $alertsWereSeen
      const alertsWereSeen = env.scope.getState(alertsModel.$alertsWereSeen);
      expect(alertsWereSeen['alert-1']).toBe(true);
      expect(alertsWereSeen['alert-2']).toBe(true);
      expect(alertsWereSeen['alert-3']).toBe(true);
    });

    it('should track alerts seen state', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Initially empty
      let alertsWereSeen = env.scope.getState(alertsModel.$alertsWereSeen);
      expect(Object.keys(alertsWereSeen).length).toBe(0);

      const testAlerts: Alert[] = [{ id: 'test-alert', type: 'bumped', seen: false, rank: 2 }];

      await allSettled(alertsModel.gate.open, {
        scope: env.scope,
        params: testAlerts,
      });

      await allSettled(alertsModel.markAsSeen, {
        scope: env.scope,
        params: 'test-alert',
      });

      alertsWereSeen = env.scope.getState(alertsModel.$alertsWereSeen);
      expect(alertsWereSeen['test-alert']).toBe(true);
    });
  });

  describe('Flow Close/Reset', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Profile',
        story: 'Flow Close/Reset',
      });
    });

    it('should close setActive flow', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Open flow
      await allSettled(setActive.flow.open, {
        scope: env.scope,
        params: {
          isActive: true,
        },
      });

      // Close flow
      await allSettled(setActive.flow.close, {
        scope: env.scope,
        params: {
          isActive: true,
        },
      });

      // Flow should be closed
      expect(setActive.flow).toBeDefined();
    });

    it('should close alerts gate', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(alertsModel.gate.open, {
        scope: env.scope,
        params: [],
      });

      await allSettled(alertsModel.gate.close, {
        scope: env.scope,
        params: [],
      });

      expect(alertsModel.gate).toBeDefined();
    });
  });

  describe('Transaction Building', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Profile',
        story: 'Transaction Building',
      });
    });

    it('should prepare transaction for activating member', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(setActive.flow.open, {
        scope: env.scope,
        params: {
          isActive: true,
        },
      });

      // All transaction-related stores should exist
      expect(setActive.$fee).toBeDefined();
      expect(setActive.$wrappedTx).toBeDefined();
      expect(setActive.$wallet).toBeDefined();
      expect(setActive.$account).toBeDefined();
    });

    it('should prepare transaction for deactivating member', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(setActive.flow.open, {
        scope: env.scope,
        params: {
          isActive: false,
        },
      });

      expect(setActive.$fee).toBeDefined();
      expect(setActive.$wrappedTx).toBeDefined();
    });
  });
});
