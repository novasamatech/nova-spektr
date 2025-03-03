import { type ApiPromise } from '@polkadot/api';
import { type Vec } from '@polkadot/types';
import { type AccountId32 } from '@polkadot/types/interfaces';

import {
  type Address,
  type ChainId,
  type MultisigAccount,
  type MultisigTransaction,
  type MultisigEvent as OldMultisigEvent,
  type Transaction,
} from '@/shared/core';
import { MultisigTxInitStatus } from '@/shared/core';
import { getCreatedDate, toAccountId } from '@/shared/lib/utils';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { type MultisigEvent, type MultisigOperation, type OperationData } from '@/domains/multisig';
import { type ExtrinsicResultParams } from '@/entities/transaction';

import { type PendingMultisigTransaction } from './types';

export const getPendingMultisigTxs = async (
  api: ApiPromise,
  address: Address,
): Promise<PendingMultisigTransaction[]> => {
  const multisigs = await api.query.multisig.multisigs.entries(address);

  return multisigs
    .filter(([, opt]) => opt.isSome)
    .reduce<PendingMultisigTransaction[]>((acc, [storage, opt]) => {
      if (opt.isNone) return acc;

      const params = opt.unwrap();
      const [, callHash] = storage.args;

      return [...acc, { callHash, params }];
    }, []);
};

export const updateOldEventsPayload = (events: OldMultisigEvent[], approvals: Vec<AccountId32>): OldMultisigEvent[] => {
  return events.map((e) => {
    const isPendingSigned = e.status === 'PENDING_SIGNED';
    const hasApproval = approvals.find((a) => a.toHex() === e.accountId);

    if (!isPendingSigned || !hasApproval) return e;

    return { ...e, status: 'SIGNED' };
  });
};

export const createNewEventsPayload = (
  events: OldMultisigEvent[],
  tx: MultisigTransaction,
  approvals: Vec<AccountId32>,
): OldMultisigEvent[] => {
  return approvals.reduce<OldMultisigEvent[]>((acc, a) => {
    const hasApprovalEvent = events.some((e) => e.status === 'SIGNED' && e.accountId === a.toHex());

    if (!hasApprovalEvent) {
      acc.push({
        txAccountId: tx.accountId,
        txChainId: tx.chainId,
        txCallHash: tx.callHash,
        txBlock: tx.blockCreated,
        txIndex: tx.indexCreated,
        status: 'SIGNED',
        accountId: a.toHex() as AccountId,
        dateCreated: Date.now(),
      });
    }

    return acc;
  }, []);
};

export const updateTransactionPayload = (
  transaction: MultisigTransaction,
  pendingTransaction: PendingMultisigTransaction,
): MultisigTransaction | undefined => {
  const { when, deposit, depositor } = pendingTransaction.params;

  const blockCreated = when.height.toNumber();
  const indexCreated = when.index.toNumber();

  if (
    transaction.blockCreated === blockCreated &&
    transaction.indexCreated === indexCreated &&
    transaction.deposit === deposit.toString() &&
    transaction.depositor === depositor.toHex()
  )
    return;

  return {
    ...transaction,
    blockCreated,
    indexCreated,
    deposit: deposit.toString(),
    depositor: depositor.toHex() as AccountId,
  };
};

export const createEventsPayload = (
  tx: MultisigTransaction,
  pendingTransaction: PendingMultisigTransaction,
  account: MultisigAccount,
  currentBlock: number,
  blockTime: number,
): OldMultisigEvent[] => {
  const { when, approvals, depositor } = pendingTransaction.params;

  const dateCreated = getCreatedDate(when.height.toNumber(), currentBlock, blockTime);

  return approvals.map((a) => ({
    txAccountId: tx.accountId,
    txChainId: tx.chainId,
    txCallHash: tx.callHash,
    txBlock: tx.blockCreated,
    txIndex: tx.indexCreated,
    status: 'SIGNED',
    accountId: account.signatories.find((s) => s.accountId === a.toHuman())?.accountId || (a.toHex() as AccountId),
    dateCreated: a.toHex() === depositor.toHex() ? dateCreated : undefined,
  }));
};

export const createTransactionPayload = (
  pendingTransaction: PendingMultisigTransaction,
  chainId: ChainId,
  account: MultisigAccount,
  currentBlock: number,
  blockTime: number,
): MultisigTransaction => {
  const { when, deposit, depositor } = pendingTransaction.params;

  const dateCreated = getCreatedDate(when.height.toNumber(), currentBlock, blockTime);

  return {
    chainId,
    dateCreated,
    blockCreated: when.height.toNumber(),
    indexCreated: when.index.toNumber(),
    status: MultisigTxInitStatus.SIGNING,
    callHash: pendingTransaction.callHash.toHex(),
    signatories: account.signatories,
    deposit: deposit.toString(),
    depositor: depositor.toHex() as AccountId,
    accountId: account.accountId || '0x',
  };
};

export const buildMultisigTx = (
  tx: OperationData,
  multisigTx: Transaction,
  params: ExtrinsicResultParams,
  account: MultisigAccount,
): MultisigOperation => {
  const operationId = generateOperationId(
    multisigTx.args.callHash,
    account.accountId,
    params.timepoint.height,
    params.timepoint.index,
  );
  const eventId = generateEventId(operationId, toAccountId(multisigTx.address), 'approve');

  const event: MultisigEvent = {
    id: eventId,
    accountId: toAccountId(multisigTx.address),
    extrinsicHash: params.extrinsicHash,
    blockCreated: pjsSchema.helpers.toBlockHeight(params.timepoint.height),
    indexCreated: params.timepoint.index,
    timestamp: Date.now(),
    status: 'approve',
  };

  const transaction: MultisigOperation = {
    id: operationId,
    accountId: account.accountId,
    depositor: toAccountId(multisigTx.address),
    chainId: multisigTx.chainId,
    callData: multisigTx.args.callData,
    callHash: multisigTx.args.callHash,
    status: 'pending',
    blockCreated: pjsSchema.helpers.toBlockHeight(params.timepoint.height),
    indexCreated: params.timepoint.index,
    timestamp: Date.now(),
    events: [event],
    ...tx,
  };

  return transaction;
};

export const generateOperationId = (callHash: string, address: string, block: number, index: number): string =>
  `${callHash}-${address}-${block}-${index}`;

export const generateEventId = (operationId: string, signer: string, status: 'approve' | 'reject'): string =>
  `${operationId}-${signer}-${status}`;
