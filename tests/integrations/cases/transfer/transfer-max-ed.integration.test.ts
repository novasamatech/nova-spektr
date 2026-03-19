import { allSettled } from 'effector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectionStatus, TransactionType } from '@/shared/core';
import { accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { formModel } from '@/features/transfer/model/form-model';
import {
  polkadotChain,
  polkadotChainId,
  recipientAccount,
  senderAccount,
  senderBalance,
  vaultWallet,
  watchOnlyWallet,
} from '../../fixtures/index';
import { type FeatureTestEnvironment, FeatureTestBuilder, allureMetadata } from '../../utils/index';

vi.mock('@/shared/api/xcm', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    xcmConfigService: {
      getXcmConfig: vi.fn().mockResolvedValue({ xcm: [] }),
    },
    spellXcmService: {
      getSpellChainName: vi.fn((chain: { name: string }) => chain?.name ?? 'Polkadot'),
    },
  };
});

vi.mock('graphql-request', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    GraphQLClient: vi.fn().mockImplementation(() => ({
      request: vi.fn().mockResolvedValue({ proxieds: { nodes: [] } }),
    })),
  };
});

const FULL_BALANCE_PLANCK = '10000000000000';

function createTransferEnvBuilder(withRecipient: boolean) {
  return new FeatureTestBuilder({ autoPopulate: false })
    .withChain(polkadotChain)
    .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
    .withStoreValue(balanceModel.__test.$balanceMap, { [senderBalance.id]: senderBalance })
    .withStoreValue(walletModel.__test.$rawWallets, withRecipient ? [vaultWallet, watchOnlyWallet] : [vaultWallet])
    .withStoreValue(accounts.__test.$list, withRecipient ? [senderAccount, recipientAccount] : [senderAccount]);
}

async function initTransferForm(env: FeatureTestEnvironment): Promise<void> {
  await env.executeEvent(formModel.formInitiated, {
    chain: polkadotChain,
    asset: polkadotChain.assets[0],
  });
}

async function fillTransferForm(
  env: FeatureTestEnvironment,
  amount: string,
  options?: { selectWallet?: boolean },
): Promise<void> {
  if (options?.selectWallet !== false) {
    await allSettled(walletSelect.select, { scope: env.scope, params: vaultWallet.id });
  }
  await initTransferForm(env);
  await allSettled(formModel.form.fields.initiator.change, {
    scope: env.scope,
    params: senderAccount,
  });
  await allSettled(formModel.form.fields.destination.change, {
    scope: env.scope,
    params: recipientAccount.accountId,
  });
  await allSettled(formModel.form.fields.amount.change, {
    scope: env.scope,
    params: amount,
  });
}

/**
 * Integration tests for Transfer MAX Button and ED (Existential Deposit)
 * Checkbox
 *
 * Verifies business logic:
 *
 * - MAX mode toggle and user-typing interaction
 * - ED checkbox toggle and independence from MAX mode
 * - Balance integration for MAX calculation
 *
 * @group integration
 * @group transfer
 * @group max-button
 */
describe('Transfer MAX + ED', { timeout: 15_000 }, () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
  });

  describe('MAX Button', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Transfer',
        feature: 'Transfer MAX + ED',
        story: 'MAX Button',
      });
    });

    it('should enable MAX mode when toggled on', async () => {
      env = await createTransferEnvBuilder(false).build();

      await initTransferForm(env);

      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(false);

      await env.executeEvent(formModel.events.toggleMaxMode, true);

      expect(env.getState(formModel.$isMaxModeEnabled)).toBe(true);
    });

    it('should switch from transfer-all to regular transfer when user types amount manually', async () => {
      env = await createTransferEnvBuilder(true).build();

      await fillTransferForm(env, '100');

      const coreTxBeforeMax = env.getState(formModel.$coreTx);
      expect(coreTxBeforeMax).not.toBeNull();
      expect(coreTxBeforeMax?.type).toBe(TransactionType.TRANSFER);

      await env.executeEvent(formModel.events.toggleMaxMode, true);

      const coreTxWithMax = env.getState(formModel.$coreTx);
      const amountWithMax = env.getState(formModel.form.fields.amount.$value);
      expect(coreTxWithMax?.type).toBe(TransactionType.TRANSFER_ALL);
      expect(amountWithMax).not.toBe('1');

      await allSettled(formModel.form.fields.amount.change, {
        scope: env.scope,
        params: '1',
      });
      await env.executeEvent(formModel.events.toggleMaxMode, false);

      const coreTxAfterTyping = env.getState(formModel.$coreTx);
      expect(coreTxAfterTyping?.type).toBe(TransactionType.TRANSFER);
      expect(coreTxAfterTyping?.args.value).toBe('10000000000');
    });
  });

  describe('ED Checkbox', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Transfer',
        feature: 'Transfer MAX + ED',
        story: 'ED Checkbox',
      });
    });

    it('should switch extrinsic from keepAlive to allowDeath when ED enabled', async () => {
      env = await createTransferEnvBuilder(true).build();

      await fillTransferForm(env, '10');

      const coreTxKeepAlive = env.getState(formModel.$coreTx);
      expect(coreTxKeepAlive?.type).toBe(TransactionType.TRANSFER);
      expect(coreTxKeepAlive?.args.keepAlive).toBe(true);

      await env.executeEvent(formModel.events.toggleExistentialDeposit, true);

      const coreTxAllowDeath = env.getState(formModel.$coreTx);
      expect(coreTxAllowDeath?.type).toBe(TransactionType.TRANSFER_ALLOW_DEATH);
      expect(coreTxAllowDeath?.args.keepAlive).toBe(false);

      await env.executeEvent(formModel.events.toggleExistentialDeposit, false);

      const coreTxBackToKeepAlive = env.getState(formModel.$coreTx);
      expect(coreTxBackToKeepAlive?.type).toBe(TransactionType.TRANSFER);
      expect(coreTxBackToKeepAlive?.args.keepAlive).toBe(true);
    });

    it('should revert amount to regular MAX (keepAlive) when ED is toggled off after being on', async () => {
      env = await createTransferEnvBuilder(true).build();

      await fillTransferForm(env, '1');

      await env.executeEvent(formModel.events.toggleMaxMode, true);
      const amountMaxOnly = env.getState(formModel.form.fields.amount.$value);

      await env.executeEvent(formModel.events.toggleExistentialDeposit, true);
      const amountMaxWithEd = env.getState(formModel.form.fields.amount.$value);
      expect(amountMaxWithEd).not.toBe(amountMaxOnly);

      await env.executeEvent(formModel.events.toggleExistentialDeposit, false);
      const amountAfterEdOff = env.getState(formModel.form.fields.amount.$value);
      expect(amountAfterEdOff).toBe(amountMaxOnly);
    });

    it('should persist allowDeath extrinsic when MAX is toggled off', async () => {
      env = await createTransferEnvBuilder(true).build();

      await fillTransferForm(env, '50');

      await env.executeEvent(formModel.events.toggleMaxMode, true);
      await env.executeEvent(formModel.events.toggleExistentialDeposit, true);

      const coreTxMaxWithEd = env.getState(formModel.$coreTx);
      expect(coreTxMaxWithEd?.type).toBe(TransactionType.TRANSFER_ALL);
      expect(coreTxMaxWithEd?.args.keepAlive).toBe(false);

      await allSettled(formModel.form.fields.amount.change, {
        scope: env.scope,
        params: '25',
      });
      await env.executeEvent(formModel.events.toggleMaxMode, false);

      const coreTxAfterMaxOff = env.getState(formModel.$coreTx);
      expect(coreTxAfterMaxOff?.type).toBe(TransactionType.TRANSFER_ALLOW_DEATH);
      expect(coreTxAfterMaxOff?.args.keepAlive).toBe(false);
      expect(coreTxAfterMaxOff?.args.value).toBe('250000000000');
    });
  });

  describe('Full Workflow', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Transfer',
        feature: 'Transfer MAX + ED',
        story: 'Full Workflow',
      });
    });

    it('should build correct extrinsic type through MAX + ED toggle sequence', async () => {
      env = await createTransferEnvBuilder(true).build();

      await fillTransferForm(env, '1');

      expect(env.getState(formModel.$coreTx)?.type).toBe(TransactionType.TRANSFER);

      await env.executeEvent(formModel.events.toggleMaxMode, true);
      expect(env.getState(formModel.$coreTx)?.type).toBe(TransactionType.TRANSFER_ALL);

      await env.executeEvent(formModel.events.toggleExistentialDeposit, true);
      expect(env.getState(formModel.$coreTx)?.type).toBe(TransactionType.TRANSFER_ALL);
      expect(env.getState(formModel.$coreTx)?.args.keepAlive).toBe(false);

      await env.executeEvent(formModel.events.toggleMaxMode, false);
      expect(env.getState(formModel.$coreTx)?.type).toBe(TransactionType.TRANSFER_ALLOW_DEATH);

      await env.executeEvent(formModel.events.toggleExistentialDeposit, false);
      expect(env.getState(formModel.$coreTx)?.type).toBe(TransactionType.TRANSFER);

      await env.executeEvent(formModel.events.toggleMaxMode, true);
      expect(env.getState(formModel.$coreTx)?.type).toBe(TransactionType.TRANSFER_ALL);
    });
  });

  describe('Balance Integration', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Transfer',
        feature: 'Transfer MAX + ED',
        story: 'Balance Integration',
      });
    });

    it('should build transfer-all extrinsic with balance from storage when MAX + ED enabled', async () => {
      env = await createTransferEnvBuilder(true).build();

      const balanceMap = env.getState(balanceModel.__test.$balanceMap);
      const senderBalanceEntry = balanceMap[senderBalance.id];
      expect(senderBalanceEntry).toBeDefined();
      expect(senderBalanceEntry!.free.toString()).toBe(FULL_BALANCE_PLANCK);

      await fillTransferForm(env, '100');

      await env.executeEvent(formModel.events.toggleMaxMode, true);
      await env.executeEvent(formModel.events.toggleExistentialDeposit, true);

      const coreTx = env.getState(formModel.$coreTx);
      expect(coreTx?.type).toBe(TransactionType.TRANSFER_ALL);
      expect(coreTx?.args.keepAlive).toBe(false);
      expect(coreTx?.args.dest).toBe(recipientAccount.accountId);
    });
  });
});
