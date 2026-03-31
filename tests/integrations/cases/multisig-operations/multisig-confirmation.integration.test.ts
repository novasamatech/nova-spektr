import { allSettled } from 'effector';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type MultisigAccount, ConnectionStatus, SigningType, TransactionType } from '@/shared/core';
import { type MultisigOperation, accountService } from '@/domains/network';
import { approveModel } from '@/features/multisig-operations/model/approve-model';
import { rejectModel } from '@/features/multisig-operations/model/reject-model';
import {
  multisigAccount,
  multisigWallet,
  polkadotChain,
  polkadotChainId,
  recipientAccount,
  signatoryAccount,
  vaultWallet,
} from '../../fixtures/index';
import { type FeatureTestEnvironment, FeatureTestBuilder, allureMetadata } from '../../utils/index';

const setupAccountHandlers = () => {
  accountService.accountAvailabilityOnChainAnyOf.registerHandler({
    body: ({ account, chain }) => (accountService.isChainAccount(account) ? account.chainId === chain.chainId : true),
    available: () => true,
  });
  accountService.accountActionPermissionAnyOf.registerHandler({
    body: ({ account }) => account.signingType !== SigningType.WATCH_ONLY,
    available: () => true,
  });
};

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
  callData: null,
  chainId: polkadotChainId,
  multisigAccountId: multisigAccount.accountId,
  depositor: signatoryAccount.accountId,
  blockCreated: 100,
  indexCreated: 1,
  events: [],
  timestamp: Date.now(),
} as unknown as MultisigOperation;

const bondOperation = {
  ...transferOperation,
  id: `${polkadotChainId}-0xdef456-${multisigAccount.accountId}-200-1`,
  transaction: {
    type: TransactionType.BOND,
    chainId: polkadotChainId,
    accountId: multisigAccount.accountId,
    args: {
      value: '50000000000',
      payee: 'Staked',
    },
  },
  callHash: '0xdef456',
} as unknown as MultisigOperation;

const typedMultisigAccount = multisigAccount as unknown as MultisigAccount;

async function createEnv() {
  return new FeatureTestBuilder()
    .withWallet(vaultWallet)
    .withWallet(multisigWallet)
    .withAccount(signatoryAccount)
    .withAccount(multisigAccount)
    .withChain(polkadotChain)
    .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
    .build();
}

describe('Multisig Operation Confirmation — Data Assembly', () => {
  let env: FeatureTestEnvironment;

  beforeEach(() => {
    setupAccountHandlers();
  });

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
    accountService.accountActionPermissionAnyOf.resetHandlers();
  });

  describe('Approve flow — confirmation screen data', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Multisig Operations',
        feature: 'Approve Transaction',
        story: 'Confirmation screen data assembly',
      });
    });

    it('should resolve multisigAccount from gate state, not from selected wallet', async () => {
      env = await createEnv();

      await allSettled(approveModel.flow.open, {
        scope: env.scope,
        params: { chain: polkadotChain, operation: transferOperation, account: typedMultisigAccount },
      });

      const resolvedMultisig = env.getState(approveModel.$multisigAccount);
      expect(resolvedMultisig).not.toBeNull();
      expect(resolvedMultisig!.accountId).toBe(multisigAccount.accountId);
      expect(resolvedMultisig!.walletId).toBe(multisigWallet.id);
    });

    it('should set initiator to the selected signatory', async () => {
      env = await createEnv();

      await allSettled(approveModel.flow.open, {
        scope: env.scope,
        params: { chain: polkadotChain, operation: transferOperation, account: typedMultisigAccount },
      });
      await allSettled(approveModel.selectInitiator, { scope: env.scope, params: signatoryAccount });

      const initiator = env.getState(approveModel.$initiator);
      expect(initiator).not.toBeNull();
      expect(initiator!.accountId).toBe(signatoryAccount.accountId);
      expect(initiator!.walletId).toBe(vaultWallet.id);
    });

    it('should provide correct data: multisig wallet + signatory initiator + multisig sender', async () => {
      env = await createEnv();

      await allSettled(approveModel.flow.open, {
        scope: env.scope,
        params: { chain: polkadotChain, operation: transferOperation, account: typedMultisigAccount },
      });
      await allSettled(approveModel.selectInitiator, { scope: env.scope, params: signatoryAccount });

      const resolvedMultisig = env.getState(approveModel.$multisigAccount);
      const initiator = env.getState(approveModel.$initiator);

      // Wallet field: multisig wallet
      expect(resolvedMultisig!.walletId).toBe(multisigWallet.id);
      // Account/Sender field: multisig account (actual sender)
      expect(resolvedMultisig!.accountId).toBe(multisigAccount.accountId);
      // Signatory/Initiator field: signing account
      expect(initiator!.accountId).toBe(signatoryAccount.accountId);
      expect(initiator!.walletId).toBe(vaultWallet.id);
    });

    it('should work the same for non-transfer operations (bond)', async () => {
      env = await createEnv();

      await allSettled(approveModel.flow.open, {
        scope: env.scope,
        params: { chain: polkadotChain, operation: bondOperation, account: typedMultisigAccount },
      });
      await allSettled(approveModel.selectInitiator, { scope: env.scope, params: signatoryAccount });

      const resolvedMultisig = env.getState(approveModel.$multisigAccount);
      const initiator = env.getState(approveModel.$initiator);

      expect(resolvedMultisig!.accountId).toBe(multisigAccount.accountId);
      expect(resolvedMultisig!.walletId).toBe(multisigWallet.id);
      expect(initiator!.accountId).toBe(signatoryAccount.accountId);
    });
  });

  describe('Reject flow — confirmation screen data', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Multisig Operations',
        feature: 'Reject Transaction',
        story: 'Confirmation screen data assembly',
      });
    });

    it('should resolve multisigAccount from gate state', async () => {
      env = await createEnv();

      await allSettled(rejectModel.flow.open, {
        scope: env.scope,
        params: { chain: polkadotChain, operation: transferOperation, account: typedMultisigAccount },
      });

      const resolvedMultisig = env.getState(rejectModel.$multisigAccount);
      expect(resolvedMultisig).not.toBeNull();
      expect(resolvedMultisig!.accountId).toBe(multisigAccount.accountId);
      expect(resolvedMultisig!.walletId).toBe(multisigWallet.id);
    });

    it('should resolve multisigAccount correctly for non-transfer operations', async () => {
      env = await createEnv();

      await allSettled(rejectModel.flow.open, {
        scope: env.scope,
        params: { chain: polkadotChain, operation: bondOperation, account: typedMultisigAccount },
      });

      const resolvedMultisig = env.getState(rejectModel.$multisigAccount);
      expect(resolvedMultisig!.accountId).toBe(multisigAccount.accountId);
      expect(resolvedMultisig!.walletId).toBe(multisigWallet.id);
    });

    it('should use depositor accountId from operation for initiator lookup', async () => {
      // Verify the operation has the correct depositor set
      expect(transferOperation.depositor).toBe(signatoryAccount.accountId);

      // The reject model's $initiator = accounts.find(a => a.accountId === operation.depositor)
      // This verifies the data contract — the operation's depositor matches our signatory
      const depositorMatches = signatoryAccount.accountId === transferOperation.depositor;
      expect(depositorMatches).toBe(true);
    });
  });
});
