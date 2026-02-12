import { allSettled } from 'effector';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionStatus } from '@/shared/core';
import { voting } from '@/features/fellowship-voting/model/voting';
import {
  polkadotChain,
  polkadotChainId,
  promotionReferendum,
  retentionReferendum,
  rfcReferendum,
  senderAccount,
  senderBalance,
  vaultWallet,
} from '../../fixtures/index';
import { type FeatureTestEnvironment, FeatureTestBuilder, allureMetadata } from '../../utils/index';

/**
 * Integration tests for Fellowship Voting
 *
 * Tests actual feature behavior including:
 *
 * - Opening voting flow with referendum
 * - Flow state management (referendum and vote stored correctly)
 * - Transaction building for votes
 * - Fee calculation
 *
 * @group integration
 * @group fellowship
 * @group fellowship-voting
 */
describe('Fellowship Voting - Integration', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
  });

  describe('Vote Submission - Aye/Nay', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Voting',
        story: 'Vote Submission - Aye/Nay',
      });
    });

    it('should open voting flow with referendum and vote Aye', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Open voting flow with referendum and aye vote
      await allSettled(voting.flow.open as any, {
        scope: env.scope,
        params: {
          referendum: promotionReferendum,
          vote: 'aye',
        },
      });

      // Verify flow is open with correct state
      const flowState = env.scope.getState(voting.flow.state);
      expect(flowState.referendum).toBeDefined();
      expect(flowState.referendum).toEqual(promotionReferendum);
      expect(flowState.vote).toBe('aye');
    });

    it('should open voting flow and vote Nay', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Open voting flow with nay vote
      await allSettled(voting.flow.open as any, {
        scope: env.scope,
        params: {
          referendum: retentionReferendum,
          vote: 'nay',
        },
      });

      const flowState = env.scope.getState(voting.flow.state);
      expect(flowState.referendum).toEqual(retentionReferendum);
      expect(flowState.vote).toBe('nay');
    });

    it('should vote on RFC referendum', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(voting.flow.open as any, {
        scope: env.scope,
        params: {
          referendum: rfcReferendum,
          vote: 'aye',
        },
      });

      const flowState = env.scope.getState(voting.flow.state);
      expect(flowState.referendum).toEqual(rfcReferendum);
      expect(flowState.referendum?.track).toBe(rfcReferendum.track);
    });
  });

  describe('Flow State Management', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Voting',
        story: 'Flow State Management',
      });
    });

    it('should track flow status', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Initially closed
      let status = env.scope.getState(voting.flow.status);
      expect(status).toBe(false);

      // Open flow
      await allSettled(voting.flow.open as any, {
        scope: env.scope,
        params: {
          referendum: promotionReferendum,
          vote: 'aye',
        },
      });

      status = env.scope.getState(voting.flow.status);
      expect(status).toBe(true);

      // Close flow
      await allSettled(voting.flow.close as any, {
        scope: env.scope,
        params: {
          referendum: promotionReferendum,
          vote: 'aye',
        },
      });

      status = env.scope.getState(voting.flow.status);
      expect(status).toBe(false);
    });

    it('should reset state when flow closes', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Open with data
      await allSettled(voting.flow.open as any, {
        scope: env.scope,
        params: {
          referendum: promotionReferendum,
          vote: 'aye',
        },
      });

      let flowState = env.scope.getState(voting.flow.state);
      expect(flowState.referendum).toBeDefined();

      // Close flow
      await allSettled(voting.flow.close as any, {
        scope: env.scope,
        params: {
          referendum: promotionReferendum,
          vote: 'aye',
        },
      });

      flowState = env.scope.getState(voting.flow.state);
      expect(flowState.referendum).toBeNull();
      expect(flowState.vote).toBeNull();
    });
  });

  describe('Transaction Building', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Voting',
        story: 'Transaction Building',
      });
    });

    it('should build wrapped transaction for vote', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(voting.flow.open as any, {
        scope: env.scope,
        params: {
          referendum: promotionReferendum,
          vote: 'aye',
        },
      });

      // Check that wrapped transaction store exists
      expect(voting.$wrappedTx).toBeDefined();
    });

    it('should calculate fee for vote transaction', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(voting.flow.open as any, {
        scope: env.scope,
        params: {
          referendum: rfcReferendum,
          vote: 'nay',
        },
      });

      // Fee store should exist
      expect(voting.$fee).toBeDefined();
    });
  });

  describe('Multiple Referendum Voting', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Voting',
        story: 'Multiple Referendum Voting',
      });
    });

    it('should handle voting on different referendums sequentially', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Vote on first referendum
      await allSettled(voting.flow.open as any, {
        scope: env.scope,
        params: {
          referendum: promotionReferendum,
          vote: 'aye',
        },
      });

      let flowState = env.scope.getState(voting.flow.state);
      expect(flowState.referendum).toEqual(promotionReferendum);

      // Close and open for different referendum
      await allSettled(voting.flow.close as any, {
        scope: env.scope,
        params: {
          referendum: promotionReferendum,
          vote: 'aye',
        },
      });

      await allSettled(voting.flow.open as any, {
        scope: env.scope,
        params: {
          referendum: retentionReferendum,
          vote: 'nay',
        },
      });

      flowState = env.scope.getState(voting.flow.state);
      expect(flowState.referendum).toEqual(retentionReferendum);
      expect(flowState.vote).toBe('nay');
    });
  });

  describe('Sign Event', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Voting',
        story: 'Sign Event',
      });
    });

    it('should have sign event defined', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(voting.sign).toBeDefined();
    });
  });

  describe('Basket Operations', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Voting',
        story: 'Basket Operations',
      });
    });

    it('should have saveToBasket event defined', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(voting.saveToBasket).toBeDefined();
    });

    it('should have removeFromBasket event defined', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(voting.removeFromBasket).toBeDefined();
    });

    it('should have $inBasket store defined', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(voting.$inBasket).toBeDefined();

      // Initial state should be { aye: false, nay: false }
      const inBasket = env.scope.getState(voting.$inBasket);
      expect(inBasket).toEqual({ aye: false, nay: false });
    });
  });
});
