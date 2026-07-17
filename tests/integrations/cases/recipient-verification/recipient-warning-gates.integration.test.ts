import { allSettled } from 'effector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('graphql-request', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    GraphQLClient: vi.fn(function () {
      return {
        request: vi.fn().mockResolvedValue({ proxieds: { nodes: [] } }),
      };
    }),
  };
});

import { type MultisigAccount, ConnectionStatus, TransactionType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';
import { type MultisigOperation, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { walletModel } from '@/entities/wallet';
import { authModel, connectionHistoryModel } from '@/aggregates/backend';
import { approveModel } from '@/features/multisig-operations/model/approve-model';
import { formModel } from '@/features/transfer/model/form-model';
import {
  multisigAccount,
  multisigWallet,
  polkadotChain,
  polkadotChainId,
  recipientAccount,
  senderAccount,
  senderBalance,
  signatoryAccount,
  vaultWallet,
} from '../../fixtures/index';
import {
  type FeatureTestEnvironment,
  FeatureTestBuilder,
  allureMetadata,
  resetAccountHandlers,
  seedAccountHandlers,
} from '../../utils/index';

const authedState = {
  accountId: createAccountId('authed-account'),
  accountName: 'Authed Account',
  permissions: [],
};

const strangerId = createAccountId('stranger');
const strangerAddress = toAddress(strangerId, { prefix: polkadotChain.addressPrefix });

/**
 * Unknown-recipient acknowledgement gates in consumer models: the transfer form
 * ($canSubmit blocked until acknowledged, acknowledgement resets with the
 * recipient/flow) and the multisig approve model (acknowledgement resets when
 * the approve flow opens or closes).
 *
 * @group integration
 * @group recipient-verification
 */
describe('Recipient Warning Gates', () => {
  let env: FeatureTestEnvironment;

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
  });

  describe('Transfer form gate', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'AddressBook',
        feature: 'Recipient Verification',
        story: 'Transfer form acknowledgement gate',
      });
    });

    async function buildTransferEnv(options: { hasEverConnected: boolean }) {
      const builder = new FeatureTestBuilder({ autoPopulate: false })
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .withStoreValue(balanceModel.__test.$balanceMap, { [senderBalance.id]: senderBalance })
        .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet])
        .withStoreValue(accounts.__test.$list, [senderAccount])
        .withStoreValue(connectionHistoryModel.$hasEverConnected, options.hasEverConnected)
        .withStoreValue(authModel.$authState, options.hasEverConnected ? authedState : null);

      const built = await builder.build();

      await built.executeEvent(formModel.formInitiated, {
        chain: polkadotChain,
        asset: polkadotChain.assets[0],
      });
      await allSettled(formModel.form.fields.destinationChain.change, {
        scope: built.scope,
        params: polkadotChain,
      });

      return built;
    }

    async function setDestination(address: string) {
      await allSettled(formModel.form.fields.destination.change, { scope: env.scope, params: address });
    }

    it('flags an unknown recipient and blocks submission until acknowledged', async () => {
      env = await buildTransferEnv({ hasEverConnected: true });

      await setDestination(strangerAddress);
      await allSettled(formModel.form.fields.amount.change, { scope: env.scope, params: '1' });

      expect(env.getState(formModel.$recipientWarning)).toBe('unknown');
      expect(env.getState(formModel.$isRiskAcknowledged)).toBe(false);
      expect(env.getState(formModel.$canSubmit)).toBe(false);

      await env.executeEvent(formModel.events.riskAcknowledgedToggled, true);

      expect(env.getState(formModel.$isRiskAcknowledged)).toBe(true);
    });

    it('resets the acknowledgement when the recipient changes', async () => {
      env = await buildTransferEnv({ hasEverConnected: true });

      await setDestination(strangerAddress);
      await env.executeEvent(formModel.events.riskAcknowledgedToggled, true);
      expect(env.getState(formModel.$isRiskAcknowledged)).toBe(true);

      const otherStranger = toAddress(createAccountId('other-stranger'), { prefix: polkadotChain.addressPrefix });
      await setDestination(otherStranger);

      expect(env.getState(formModel.$isRiskAcknowledged)).toBe(false);
      expect(env.getState(formModel.$recipientWarning)).toBe('unknown');
    });

    it('resets the acknowledgement when a fresh flow starts', async () => {
      env = await buildTransferEnv({ hasEverConnected: true });

      await setDestination(strangerAddress);
      await env.executeEvent(formModel.events.riskAcknowledgedToggled, true);

      await env.executeEvent(formModel.formInitiated, {
        chain: polkadotChain,
        asset: polkadotChain.assets[0],
      });

      expect(env.getState(formModel.$isRiskAcknowledged)).toBe(false);
    });

    it('never warns on an own account recipient while active', async () => {
      env = await buildTransferEnv({ hasEverConnected: true });

      await setDestination(toAddress(senderAccount.accountId, { prefix: polkadotChain.addressPrefix }));

      expect(env.getState(formModel.$recipientWarning)).toBe('none');
    });

    it('stays silent when the address book was never connected', async () => {
      env = await buildTransferEnv({ hasEverConnected: false });

      await setDestination(strangerAddress);

      expect(env.getState(formModel.$recipientWarning)).toBe('none');
    });
  });

  describe('Approve model gate', () => {
    const transferOperation = {
      id: `${polkadotChainId}-0xabc123-${multisigAccount.accountId}-100-1`,
      status: 'pending',
      transaction: {
        type: TransactionType.TRANSFER,
        chainId: polkadotChainId,
        accountId: multisigAccount.accountId,
        args: {
          dest: recipientAccount.accountId,
          value: '10000000000',
          asset: 0,
        },
      },
      method: null,
      section: null,
      callHash: '0xabc123',
    } as unknown as MultisigOperation;

    const typedMultisigAccount = multisigAccount as unknown as MultisigAccount;
    const flowParams = { chain: polkadotChain, operation: transferOperation, account: typedMultisigAccount };

    beforeEach(async () => {
      seedAccountHandlers();
      await allureMetadata({
        epic: 'AddressBook',
        feature: 'Recipient Verification',
        story: 'Approve dialog acknowledgement gate',
      });
    });

    afterEach(() => {
      resetAccountHandlers();
    });

    it('warns on an unknown operation destination and resets the acknowledgement across the flow', async () => {
      env = await new FeatureTestBuilder()
        .withWallet(vaultWallet)
        .withWallet(multisigWallet)
        .withAccount(signatoryAccount)
        .withAccount(multisigAccount)
        .withChain(polkadotChain)
        .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
        .withStoreValue(connectionHistoryModel.$hasEverConnected, true)
        .withStoreValue(authModel.$authState, authedState)
        .build();

      await allSettled(approveModel.flow.open, { scope: env.scope, params: flowParams });

      // The operation pays recipientAccount, which is neither a contact nor an own account here.
      expect(env.getState(approveModel.$recipientWarning)).toBe('unknown');

      await env.executeEvent(approveModel.riskAcknowledgedToggled, true);
      expect(env.getState(approveModel.$isRiskAcknowledged)).toBe(true);

      await allSettled(approveModel.flow.close, { scope: env.scope, params: flowParams });
      expect(env.getState(approveModel.$isRiskAcknowledged)).toBe(false);

      // Reopening never inherits a stale acknowledgement.
      await allSettled(approveModel.flow.open, { scope: env.scope, params: flowParams });
      expect(env.getState(approveModel.$isRiskAcknowledged)).toBe(false);
    });
  });
});
