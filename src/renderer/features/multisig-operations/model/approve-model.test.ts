import { BN } from '@polkadot/util';
import { type Scope, allSettled, fork } from 'effector';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type Chain,
  type Contact,
  type DecodedTransaction,
  type MultisigAccount,
  TransactionType,
} from '@/shared/core';
import { getCallHash } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type AnyAccount,
  type MultisigOperation,
  MultisigEventStatus,
  accounts,
  transactionService,
} from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
import { authModel, connectionHistoryModel } from '@/aggregates/backend';

import { approveModel } from './approve-model';
import {
  OTHER_CHAIN_ID,
  TEST_CHAIN_ID,
  aId,
  chainScopedAccount,
  createFakeApi,
  createMultisigAccount,
  fakeWeight,
  seedDiHandlers,
  testChain,
  vaultAccount,
  watchOnlyAccount,
} from './test-helpers';

type OperationParams = {
  multisigAccountId: AccountId;
  approvers?: AccountId[];
  callData?: string | null;
  callHash?: string;
  transaction?: DecodedTransaction | null;
};

const createOperation = ({
  multisigAccountId,
  approvers = [],
  callData = null,
  callHash = '0xabc123',
  transaction = null,
}: OperationParams): MultisigOperation =>
  ({
    id: `${TEST_CHAIN_ID}-${callHash}-${multisigAccountId}-100-1`,
    status: 'pending',
    transaction,
    method: null,
    section: null,
    callHash,
    callData,
    chainId: TEST_CHAIN_ID,
    multisigAccountId,
    depositor: approvers[0] ?? multisigAccountId,
    blockCreated: 100,
    indexCreated: 1,
    events: approvers.map((accountId, index) => ({
      id: `event-${index}`,
      accountId,
      status: MultisigEventStatus.Approve,
      blockCreated: 100,
      indexCreated: index,
      timestamp: 0,
    })),
    timestamp: 0,
  }) as unknown as MultisigOperation;

type ScopeParams = {
  accountList?: (AnyAccount | MultisigAccount)[];
  withApi?: boolean;
};

const createScope = async ({ accountList = [], withApi = false }: ScopeParams = {}) => {
  const values = new Map().set(accounts.__test.$list, accountList);
  if (withApi) {
    values.set(networkModel.$apis, { [TEST_CHAIN_ID]: createFakeApi() });
  }

  const scope = fork({ values });
  await seedDiHandlers(scope);

  return scope;
};

const openFlow = (scope: Scope, operation: MultisigOperation, account: MultisigAccount, chain: Chain = testChain) => {
  return allSettled(approveModel.flow.open, { scope, params: { chain, operation, account } });
};

describe('approve model', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('signatory preselection', () => {
    it('preselects the only actionable signatory as initiator and signatory', async () => {
      const ownedSignatory = vaultAccount(aId(1));
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = await createScope({ accountList: [ownedSignatory, multisigAccount] });
      await openFlow(scope, operation, multisigAccount);

      expect(scope.getState(approveModel.$unsignedAccounts)).toEqual([ownedSignatory]);
      expect(scope.getState(approveModel.$initiator)).toBe(ownedSignatory);
      expect(scope.getState(approveModel.$signatory)).toBe(ownedSignatory);
    });

    it('offers all actionable signatories without preselecting when several are eligible', async () => {
      const firstSignatory = vaultAccount(aId(1), 1);
      const secondSignatory = vaultAccount(aId(2), 2);
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = await createScope({ accountList: [firstSignatory, secondSignatory, multisigAccount] });
      await openFlow(scope, operation, multisigAccount);

      expect(scope.getState(approveModel.$unsignedAccounts)).toEqual([firstSignatory, secondSignatory]);
      expect(scope.getState(approveModel.$initiator)).toBeNull();
    });

    it('honors explicit initiator selection and resolves the signatory from it', async () => {
      const firstSignatory = vaultAccount(aId(1), 1);
      const secondSignatory = vaultAccount(aId(2), 2);
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = await createScope({ accountList: [firstSignatory, secondSignatory, multisigAccount] });
      await openFlow(scope, operation, multisigAccount);
      await allSettled(approveModel.selectInitiator, { scope, params: secondSignatory });

      expect(scope.getState(approveModel.$initiator)).toBe(secondSignatory);
      expect(scope.getState(approveModel.$signatory)).toBe(secondSignatory);
    });

    it('honors explicit signatory selection', async () => {
      const firstSignatory = vaultAccount(aId(1), 1);
      const secondSignatory = vaultAccount(aId(2), 2);
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = await createScope({ accountList: [firstSignatory, secondSignatory, multisigAccount] });
      await openFlow(scope, operation, multisigAccount);
      await allSettled(approveModel.selectInitiator, { scope, params: secondSignatory });
      await allSettled(approveModel.selectSignatory, { scope, params: firstSignatory });

      expect(scope.getState(approveModel.$signatory)).toBe(firstSignatory);
    });

    it('excludes a signatory that already approved and preselects the remaining one', async () => {
      const firstSignatory = vaultAccount(aId(1), 1);
      const secondSignatory = vaultAccount(aId(2), 2);
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId, approvers: [aId(1)] });

      const scope = await createScope({ accountList: [firstSignatory, secondSignatory, multisigAccount] });
      await openFlow(scope, operation, multisigAccount);

      expect(scope.getState(approveModel.$unsignedAccounts)).toEqual([secondSignatory]);
      expect(scope.getState(approveModel.$initiator)).toBe(secondSignatory);
    });

    it('excludes watch-only signatory accounts', async () => {
      const watchOnlySignatory = watchOnlyAccount(aId(1), 1);
      const vaultSignatory = vaultAccount(aId(2), 2);
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = await createScope({ accountList: [watchOnlySignatory, vaultSignatory, multisigAccount] });
      await openFlow(scope, operation, multisigAccount);

      expect(scope.getState(approveModel.$unsignedAccounts)).toEqual([vaultSignatory]);
      expect(scope.getState(approveModel.$initiator)).toBe(vaultSignatory);
    });

    it('excludes signatory accounts that are not available on the operation chain', async () => {
      const otherChainSignatory = chainScopedAccount(aId(1), OTHER_CHAIN_ID, 1);
      const reachableSignatory = vaultAccount(aId(2), 2);
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = await createScope({ accountList: [otherChainSignatory, reachableSignatory, multisigAccount] });
      await openFlow(scope, operation, multisigAccount);

      expect(scope.getState(approveModel.$unsignedAccounts)).toEqual([reachableSignatory]);
      expect(scope.getState(approveModel.$initiator)).toBe(reachableSignatory);
    });
  });

  describe('call data requirement for signing', () => {
    const mockTransactionBoundaries = () => {
      vi.spyOn(transactionService, 'getTransactionWeight').mockResolvedValue(fakeWeight);
      vi.spyOn(transactionService, 'getSplitExtrinsicFee').mockResolvedValue(new BN(0));
      vi.spyOn(transactionService, 'wrapLegacyTransaction').mockImplementation(async transaction => ({
        ...transaction,
      }));
    };

    it('builds an executing asMulti transaction when valid call data is present', async () => {
      mockTransactionBoundaries();

      const ownedSignatory = vaultAccount(aId(1));
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const callData = '0x0400';
      const operation = createOperation({
        multisigAccountId: multisigAccount.accountId,
        callData,
        callHash: getCallHash(callData),
      });

      const scope = await createScope({ accountList: [ownedSignatory, multisigAccount], withApi: true });
      await openFlow(scope, operation, multisigAccount);

      const transaction = scope.getState(approveModel.$transaction);
      expect(transaction).not.toBeNull();
      expect(transaction?.type).toBe(TransactionType.MULTISIG_AS_MULTI);
      expect(transaction?.accountId).toBe(ownedSignatory.accountId);
      expect(transaction?.args.call).toBe(callData);
    });

    it('builds no transaction when call data is missing — approve is blocked', async () => {
      mockTransactionBoundaries();

      const ownedSignatory = vaultAccount(aId(1));
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId, callData: null });

      const scope = await createScope({ accountList: [ownedSignatory, multisigAccount], withApi: true });
      await openFlow(scope, operation, multisigAccount);

      expect(scope.getState(approveModel.$transaction)).toBeNull();
      expect(scope.getState(approveModel.$signingPayloads)).toBeNull();
      expect(scope.getState(approveModel.$canSubmit)).toBe(false);
    });

    it('falls back to a non-executing approveAsMulti transaction when call data does not match the hash', async () => {
      mockTransactionBoundaries();

      const ownedSignatory = vaultAccount(aId(1));
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operation = createOperation({
        multisigAccountId: multisigAccount.accountId,
        callData: '0x0400',
        callHash: getCallHash('0xdead'),
      });

      const scope = await createScope({ accountList: [ownedSignatory, multisigAccount], withApi: true });
      await openFlow(scope, operation, multisigAccount);

      const transaction = scope.getState(approveModel.$transaction);
      expect(transaction).not.toBeNull();
      expect(transaction?.type).toBe(TransactionType.MULTISIG_APPROVE_AS_MULTI);
    });
  });

  describe('weight of the open operation', () => {
    it('ignores a weight that arrives for an operation opened earlier', async () => {
      let resolveWeight: (weight: typeof fakeWeight) => void = () => {};
      vi.spyOn(transactionService, 'getTransactionWeight').mockReturnValue(
        new Promise(resolve => {
          resolveWeight = resolve;
        }),
      );
      vi.spyOn(transactionService, 'getSplitExtrinsicFee').mockResolvedValue(new BN(0));
      vi.spyOn(transactionService, 'wrapLegacyTransaction').mockImplementation(async transaction => ({
        ...transaction,
      }));

      const ownedSignatory = vaultAccount(aId(1));
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const callData = '0x0400';
      const withCallData = createOperation({
        multisigAccountId: multisigAccount.accountId,
        callData,
        callHash: getCallHash(callData),
      });
      const withoutCallData = createOperation({
        multisigAccountId: multisigAccount.accountId,
        callData: null,
        callHash: '0xdef456',
      });

      const scope = await createScope({ accountList: [ownedSignatory, multisigAccount], withApi: true });

      // The first operation's weight is still pending when the second one opens.
      const settled = [
        openFlow(scope, withCallData, multisigAccount),
        allSettled(approveModel.flow.close, {
          scope,
          params: { chain: testChain, operation: withCallData, account: multisigAccount },
        }),
        openFlow(scope, withoutCallData, multisigAccount),
      ];
      resolveWeight(fakeWeight);
      await Promise.all(settled);

      expect(scope.getState(approveModel.$transaction)).toBeNull();
      expect(scope.getState(approveModel.$signingPayloads)).toBeNull();
    });

    it('builds no transaction for a newly opened operation until its own weight arrives', async () => {
      let resolveWeight: (weight: typeof fakeWeight) => void = () => {};
      vi.spyOn(transactionService, 'getTransactionWeight')
        .mockResolvedValueOnce(fakeWeight)
        .mockReturnValueOnce(
          new Promise(resolve => {
            resolveWeight = resolve;
          }),
        );
      vi.spyOn(transactionService, 'getSplitExtrinsicFee').mockResolvedValue(new BN(0));
      vi.spyOn(transactionService, 'wrapLegacyTransaction').mockImplementation(async transaction => ({
        ...transaction,
      }));

      const ownedSignatory = vaultAccount(aId(1));
      const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);
      const operationOf = (callData: `0x${string}`) =>
        createOperation({ multisigAccountId: multisigAccount.accountId, callData, callHash: getCallHash(callData) });
      const first = operationOf('0x0400');
      const second = operationOf('0x0401');

      const scope = await createScope({ accountList: [ownedSignatory, multisigAccount], withApi: true });
      await openFlow(scope, first, multisigAccount);
      expect(scope.getState(approveModel.$transaction)).not.toBeNull();

      await allSettled(approveModel.flow.close, {
        scope,
        params: { chain: testChain, operation: first, account: multisigAccount },
      });

      const opened = openFlow(scope, second, multisigAccount);
      await new Promise(resolve => setTimeout(resolve));
      expect(scope.getState(approveModel.$transaction)).toBeNull();

      resolveWeight(fakeWeight);
      await opened;
      expect(scope.getState(approveModel.$transaction)?.args.call).toBe('0x0401');
    });
  });

  describe('risk acknowledgement gate', () => {
    it('starts unacknowledged and follows the toggle', async () => {
      const multisigAccount = createMultisigAccount(aId(9), [aId(1)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = fork();
      await openFlow(scope, operation, multisigAccount);

      expect(scope.getState(approveModel.$isRiskAcknowledged)).toBe(false);

      await allSettled(approveModel.riskAcknowledgedToggled, { scope, params: true });
      expect(scope.getState(approveModel.$isRiskAcknowledged)).toBe(true);

      await allSettled(approveModel.riskAcknowledgedToggled, { scope, params: false });
      expect(scope.getState(approveModel.$isRiskAcknowledged)).toBe(false);
    });

    it('resets on flow open so acknowledgement never carries across operations', async () => {
      const multisigAccount = createMultisigAccount(aId(9), [aId(1)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = fork();
      await openFlow(scope, operation, multisigAccount);
      await allSettled(approveModel.riskAcknowledgedToggled, { scope, params: true });
      expect(scope.getState(approveModel.$isRiskAcknowledged)).toBe(true);

      await openFlow(scope, operation, multisigAccount);
      expect(scope.getState(approveModel.$isRiskAcknowledged)).toBe(false);
    });

    it('resets on flow close', async () => {
      const multisigAccount = createMultisigAccount(aId(9), [aId(1)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = fork();
      await openFlow(scope, operation, multisigAccount);
      await allSettled(approveModel.riskAcknowledgedToggled, { scope, params: true });

      await allSettled(approveModel.flow.close, {
        scope,
        params: { chain: testChain, operation, account: multisigAccount },
      });
      expect(scope.getState(approveModel.$isRiskAcknowledged)).toBe(false);
    });
  });

  describe('unknown recipient gate', () => {
    const STRANGER = aId(77);
    const CONTACT = aId(55);
    const CALL_DATA = '0x0400';

    const callOf = (type: TransactionType | undefined, args: Record<string, unknown>) =>
      ({
        type,
        section: 'any',
        method: 'any',
        chainId: TEST_CHAIN_ID,
        address: '',
        args,
      }) as unknown as DecodedTransaction;
    const transferTo = (dest: AccountId) => callOf(TransactionType.TRANSFER, { dest, value: '1' });
    const batchOf = (...transactions: DecodedTransaction[]) => callOf(TransactionType.BATCH_ALL, { transactions });

    const ownedSignatory = vaultAccount(aId(1));
    const multisigAccount = createMultisigAccount(aId(9), [aId(1), aId(2)]);

    const operationOf = (transaction: DecodedTransaction | null, callData: string | null = CALL_DATA) =>
      createOperation({ multisigAccountId: multisigAccount.accountId, callData, transaction });

    // `active` — address book connected and healthy, the only situation in
    // which a recipient can actually be checked; `unverifiable` — connected
    // before, signed out now; `off` — never connected.
    const createScopeIn = async (mode: 'active' | 'unverifiable' | 'off') => {
      const scope = fork({
        values: new Map<any, any>([
          [accounts.__test.$list, [ownedSignatory, multisigAccount]],
          [contactModel.$backendContacts, [{ accountId: CONTACT, name: 'Known contact' } as unknown as Contact]],
          [connectionHistoryModel.$hasEverConnected, mode !== 'off'],
          [
            authModel.$authState,
            mode === 'active' ? { accountId: aId(8), accountName: 'Backend user', permissions: [] } : null,
          ],
        ]),
      });
      await seedDiHandlers(scope);

      return scope;
    };
    const createVerifiedScope = () => createScopeIn('active');

    const warningOf = async (operation: MultisigOperation) => {
      const scope = await createVerifiedScope();
      await openFlow(scope, operation, multisigAccount);

      return scope.getState(approveModel.$recipientWarning);
    };

    it('warns when a batch pays an account that is neither own nor a contact', async () => {
      expect(await warningOf(operationOf(batchOf(transferTo(CONTACT), transferTo(STRANGER))))).toBe('unknown');
    });

    it('warns when a transfer to an unknown account is wrapped in a proxy call', async () => {
      const proxied = callOf(TransactionType.PROXY, { transaction: transferTo(STRANGER) });

      expect(await warningOf(operationOf(proxied))).toBe('unknown');
    });

    it('warns when the reward destination is set to an unknown account', async () => {
      const setPayee = callOf(TransactionType.DESTINATION, { payee: { Account: STRANGER } });

      expect(await warningOf(operationOf(setPayee))).toBe('unknown');
      expect(await warningOf(operationOf(callOf(TransactionType.DESTINATION, { payee: 'Staked' })))).toBe('none');
    });

    it('warns about a vested transfer to an unknown account', async () => {
      expect(await warningOf(operationOf(callOf(TransactionType.VESTED_TRANSFER, { target: STRANGER })))).toBe(
        'unknown',
      );
    });

    it('does not warn when every recipient is a contact or an own account', async () => {
      expect(await warningOf(operationOf(transferTo(CONTACT)))).toBe('none');
      expect(await warningOf(operationOf(batchOf(transferTo(CONTACT), transferTo(ownedSignatory.accountId))))).toBe(
        'none',
      );
    });

    it('warns when the recipient of the call can not be read', async () => {
      expect(await warningOf(operationOf(callOf(undefined, {})))).toBe('unknown');
      expect(await warningOf(operationOf(batchOf(transferTo(CONTACT), transferTo('garbage' as AccountId))))).toBe(
        'unknown',
      );
      // Call data that is there but did not decode.
      expect(await warningOf(operationOf(null))).toBe('unknown');
    });

    it('does not warn while the call data of the operation is not known', async () => {
      expect(await warningOf(operationOf(null, null))).toBe('none');
    });

    it('does not start signing until the warning is acknowledged', async () => {
      const scope = await createVerifiedScope();
      await openFlow(scope, operationOf(batchOf(transferTo(STRANGER))), multisigAccount);

      await allSettled(approveModel.startSigning, { scope });
      expect(scope.getState(approveModel.$isSigning)).toBe(false);

      await allSettled(approveModel.riskAcknowledgedToggled, { scope, params: true });
      await allSettled(approveModel.startSigning, { scope });
      expect(scope.getState(approveModel.$isSigning)).toBe(true);
    });

    it('starts signing right away when there is nothing to acknowledge', async () => {
      const scope = await createVerifiedScope();
      await openFlow(scope, operationOf(transferTo(CONTACT)), multisigAccount);

      await allSettled(approveModel.startSigning, { scope });
      expect(scope.getState(approveModel.$isSigning)).toBe(true);
    });

    it('holds the gate for every recipient while the address book can not vouch for them', async () => {
      const scope = await createScopeIn('unverifiable');
      await openFlow(scope, operationOf(transferTo(CONTACT)), multisigAccount);

      expect(scope.getState(approveModel.$recipientWarning)).toBe('unverifiable');

      await allSettled(approveModel.startSigning, { scope });
      expect(scope.getState(approveModel.$isSigning)).toBe(false);

      await allSettled(approveModel.riskAcknowledgedToggled, { scope, params: true });
      await allSettled(approveModel.startSigning, { scope });
      expect(scope.getState(approveModel.$isSigning)).toBe(true);
    });

    it('stays silent and starts signing when the address book was never connected', async () => {
      const scope = await createScopeIn('off');
      await openFlow(scope, operationOf(batchOf(transferTo(STRANGER))), multisigAccount);

      expect(scope.getState(approveModel.$recipientWarning)).toBe('none');

      await allSettled(approveModel.startSigning, { scope });
      expect(scope.getState(approveModel.$isSigning)).toBe(true);
    });

    it('leaves the signing step on cancel and when the flow reopens or closes', async () => {
      const scope = await createVerifiedScope();
      const operation = operationOf(transferTo(CONTACT));
      await openFlow(scope, operation, multisigAccount);

      await allSettled(approveModel.startSigning, { scope });
      await allSettled(approveModel.cancelSigning, { scope });
      expect(scope.getState(approveModel.$isSigning)).toBe(false);

      await allSettled(approveModel.startSigning, { scope });
      await openFlow(scope, operation, multisigAccount);
      expect(scope.getState(approveModel.$isSigning)).toBe(false);

      await allSettled(approveModel.startSigning, { scope });
      await allSettled(approveModel.flow.close, {
        scope,
        params: { chain: testChain, operation, account: multisigAccount },
      });
      expect(scope.getState(approveModel.$isSigning)).toBe(false);
    });
  });

  describe('description', () => {
    it('keeps the entered description for the post-sign step', async () => {
      const multisigAccount = createMultisigAccount(aId(9), [aId(1)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = fork();
      await openFlow(scope, operation, multisigAccount);
      await allSettled(approveModel.setDescription, { scope, params: 'Payment for services' });

      expect(scope.getState(approveModel.$description)).toBe('Payment for services');
    });

    it('clears the description on a new flow open', async () => {
      const multisigAccount = createMultisigAccount(aId(9), [aId(1)]);
      const operation = createOperation({ multisigAccountId: multisigAccount.accountId });

      const scope = fork();
      await openFlow(scope, operation, multisigAccount);
      await allSettled(approveModel.setDescription, { scope, params: 'Payment for services' });

      await openFlow(scope, operation, multisigAccount);
      expect(scope.getState(approveModel.$description)).toBe('');
    });
  });
});
