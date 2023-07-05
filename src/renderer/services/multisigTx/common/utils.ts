import { ApiPromise } from '@polkadot/api';

import { MultisigAccount } from '@renderer/domain/account';
import { Address, ChainId } from '@renderer/domain/shared-kernel';
import { MultisigEvent, MultisigTransaction, MultisigTxInitStatus } from '@renderer/domain/transaction';
import { PendingMultisigTransaction } from './types';
import { getCreatedDate } from '@renderer/shared/utils/substrate';

export const getPendingMultisigTxs = async (
  api: ApiPromise,
  address: Address,
): Promise<PendingMultisigTransaction[]> => {
  const multisigs = await api.query.multisig.multisigs.entries(address);

  return multisigs
    .filter(([, opt]) => opt.isSome)
    .reduce<PendingMultisigTransaction[]>((result, [storage, opt]) => {
      if (opt.isNone) return result;

      const params = opt.unwrap();
      const [, callHash] = storage.args;

      return [...result, { callHash, params }];
    }, []);
};

export const updateOldEventsPayload = (events: MultisigEvent[], pendingTransaction: PendingMultisigTransaction) => {
  return events.map((e) => {
    return e.status === 'PENDING_SIGNED' && pendingTransaction.params.approvals.find((a) => a.toHex() === e.accountId)
      ? ({
          ...e,
          status: 'SIGNED',
        } as MultisigEvent)
      : e;
  });
};

export const createNewEventsPayload = (
  events: MultisigEvent[],
  tx: MultisigTransaction,
  pendingTransaction: PendingMultisigTransaction,
): MultisigEvent[] => {
  return pendingTransaction.params.approvals.reduce<MultisigEvent[]>((acc, a) => {
    const hasApprovalEvent = events.find((e) => e.status === 'SIGNED' && e.accountId === a.toHex());

    if (!hasApprovalEvent) {
      acc.push({
        txAccountId: tx.accountId,
        txChainId: tx.chainId,
        txCallHash: tx.callHash,
        txBlock: tx.blockCreated,
        txIndex: tx.indexCreated,
        status: 'SIGNED',
        accountId: a.toHex(),
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
  // const { events } = transaction;
  const { when, deposit, depositor } = pendingTransaction.params;

  const blockCreated = when.height.toNumber();
  const indexCreated = when.index.toNumber();

  if (
    transaction.blockCreated === blockCreated &&
    transaction.indexCreated === indexCreated &&
    transaction.deposit === deposit.toString() &&
    transaction.depositor === depositor.toHex()
  ) {
    return;
  }

  return {
    ...transaction,
    blockCreated,
    indexCreated,
    deposit: deposit.toString(),
    depositor: depositor.toHex(),
  };
};

export const createEventsPayload = (
  tx: MultisigTransaction,
  pendingTransaction: PendingMultisigTransaction,
  account: MultisigAccount,
  currentBlock: number,
  blockTime: number,
): MultisigEvent[] => {
  const { when, approvals, depositor } = pendingTransaction.params;

  const dateCreated = getCreatedDate(when.height.toNumber(), currentBlock, blockTime);

  const events: MultisigEvent[] = approvals.map((a) => ({
    txAccountId: tx.accountId,
    txChainId: tx.chainId,
    txCallHash: tx.callHash,
    txBlock: tx.blockCreated,
    txIndex: tx.indexCreated,
    status: 'SIGNED',
    accountId: account.signatories.find((s) => s.accountId === a.toHuman())?.accountId || a.toHex(),
    dateCreated: a.toHex() === depositor.toHex() ? dateCreated : undefined,
  }));

  return events;
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
    depositor: depositor.toHex(),
    accountId: account.accountId || '0x',
  };
};
