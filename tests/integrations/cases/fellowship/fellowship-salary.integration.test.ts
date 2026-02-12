import { allSettled } from 'effector';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionStatus } from '@/shared/core';
import { beneficiary } from '@/features/fellowship-salary/model/beneficiary';
import { salaryInduct } from '@/features/fellowship-salary/model/salaryInduct';
import { salaryPayout } from '@/features/fellowship-salary/model/salaryPayout';
import { salaryRequest } from '@/features/fellowship-salary/model/salaryRequest';
import {
  beneficiaryAccount,
  polkadotChain,
  polkadotChainId,
  senderAccount,
  senderBalance,
  vaultWallet,
} from '../../fixtures/index';
import { type FeatureTestEnvironment, FeatureTestBuilder, allureMetadata } from '../../utils/index';

/**
 * Integration tests for Fellowship Salary Management
 *
 * Tests actual feature behavior including:
 *
 * - Salary induction gate and stores
 * - Salary request gate and stores
 * - Salary payout gate and stores
 * - Beneficiary management
 * - Sign and saveToBasket events existence
 *
 * @group integration
 * @group fellowship
 * @group fellowship-salary
 */
describe('Fellowship Salary - Integration', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
  });

  describe('Salary Induction', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Salary',
        story: 'Salary Induction',
      });
    });

    it('should open salary induction gate', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Open induction gate
      await allSettled(salaryInduct.gate.open, {
        scope: env.scope,
        params: null,
      });

      // Gate status should be true
      const status = env.scope.getState(salaryInduct.gate.status);
      expect(status).toBe(true);
    });

    it('should have fee store for induction transaction', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Fee store should exist
      expect(salaryInduct.$fee).toBeDefined();
    });

    it('should have wrapped transaction store', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Wrapped transaction store should exist
      expect(salaryInduct.$wrappedTx).toBeDefined();
    });

    it('should have sign event defined', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(salaryInduct.sign).toBeDefined();
    });

    it('should have saveToBasket event defined', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(salaryInduct.saveToBasket).toBeDefined();
    });

    it('should have $inBasket store defined', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(salaryInduct.$inBasket).toBeDefined();
    });

    it('should close induction gate', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(salaryInduct.gate.open, {
        scope: env.scope,
        params: null,
      });

      let status = env.scope.getState(salaryInduct.gate.status);
      expect(status).toBe(true);

      await allSettled(salaryInduct.gate.close, {
        scope: env.scope,
        params: null,
      });

      status = env.scope.getState(salaryInduct.gate.status);
      expect(status).toBe(false);
    });
  });

  describe('Salary Request', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Salary',
        story: 'Salary Request',
      });
    });

    it('should open salary request gate', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(salaryRequest.gate.open, {
        scope: env.scope,
        params: null,
      });

      const status = env.scope.getState(salaryRequest.gate.status);
      expect(status).toBe(true);
    });

    it('should have fee store for salary request', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(salaryRequest.$fee).toBeDefined();
    });

    it('should have wrapped transaction store for request', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(salaryRequest.$wrappedTx).toBeDefined();
    });

    it('should have sign event for salary request', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(salaryRequest.sign).toBeDefined();
    });

    it('should have saveToBasket event for salary request', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(salaryRequest.saveToBasket).toBeDefined();
    });
  });

  describe('Salary Payout', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Salary',
        story: 'Salary Payout',
      });
    });

    it('should open salary payout gate', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      await allSettled(salaryPayout.gate.open, {
        scope: env.scope,
        params: null,
      });

      const status = env.scope.getState(salaryPayout.gate.status);
      expect(status).toBe(true);
    });

    it('should have fee store for payout transaction', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(salaryPayout.$fee).toBeDefined();
    });

    it('should have wrapped transaction store for payout', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(salaryPayout.$wrappedTx).toBeDefined();
    });

    it('should have sign event for payout', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(salaryPayout.sign).toBeDefined();
    });

    it('should have saveToBasket event for payout', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(salaryPayout.saveToBasket).toBeDefined();
    });
  });

  describe('Beneficiary Management', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Salary',
        story: 'Beneficiary Management',
      });
    });

    it('should have beneficiary store defined', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(beneficiary.$beneficiary).toBeDefined();
    });

    it('should have change event defined', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(beneficiary.change).toBeDefined();
    });

    it('should change beneficiary account', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Change beneficiary
      await allSettled(beneficiary.change, {
        scope: env.scope,
        params: beneficiaryAccount,
      });

      const currentBeneficiary = env.scope.getState(beneficiary.$beneficiary);
      expect(currentBeneficiary).toBe(beneficiaryAccount);
    });

    it('should update beneficiary to different account', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Set initial beneficiary
      await allSettled(beneficiary.change, {
        scope: env.scope,
        params: senderAccount.accountId,
      });

      let currentBeneficiary = env.scope.getState(beneficiary.$beneficiary);
      expect(currentBeneficiary).toBe(senderAccount.accountId);

      // Change to different beneficiary
      await allSettled(beneficiary.change, {
        scope: env.scope,
        params: beneficiaryAccount,
      });

      currentBeneficiary = env.scope.getState(beneficiary.$beneficiary);
      expect(currentBeneficiary).toBe(beneficiaryAccount);
    });

    it('should allow setting beneficiary to null', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      // Set beneficiary
      await allSettled(beneficiary.change, {
        scope: env.scope,
        params: beneficiaryAccount,
      });

      // Clear beneficiary
      await allSettled(beneficiary.change, {
        scope: env.scope,
        params: null,
      });

      const currentBeneficiary = env.scope.getState(beneficiary.$beneficiary);
      expect(currentBeneficiary).toBeNull();
    });
  });

  describe('All Salary Models Structure', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Fellowship',
        feature: 'Fellowship Salary',
        story: 'All Salary Models Structure',
      });
    });

    it('should have wallet and account stores in induction', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(salaryInduct.$wallet).toBeDefined();
      expect(salaryInduct.$account).toBeDefined();
    });

    it('should have wallet and account stores in request', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(salaryRequest.$wallet).toBeDefined();
      expect(salaryRequest.$account).toBeDefined();
    });

    it('should have wallet and account stores in payout', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withAccount(senderAccount)
        .withBalance(senderBalance)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .build();

      expect(salaryPayout.$wallet).toBeDefined();
      expect(salaryPayout.$account).toBeDefined();
    });
  });
});
