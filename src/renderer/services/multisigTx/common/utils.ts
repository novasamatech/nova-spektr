import { ApiPromise } from '@polkadot/api';

import { MultisigAccount } from '@renderer/domain/account';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { Signatory } from '@renderer/domain/signatory';
import { MultisigEvent, MultisigTransaction, MultisigTxInitStatus } from '@renderer/domain/transaction';
import { PendingMultisigTransaction } from './types';

export const getPendingMultisigTxs = async (
  api: ApiPromise,
  address: AccountID,
): Promise<PendingMultisigTransaction[]> => {
  const multisigs = await api.query.multisig.multisigs.entries(address);

  return multisigs
    .filter(([, opt]) => opt.isSome)
    .reduce<PendingMultisigTransaction[]>((result, [storage, opt]) => {
      if (opt.isNone) return result;

      const params = opt.unwrap();
      const [, callHash] = storage.args;

      return [
        ...result,
        {
          callHash,
          params,
        },
      ];
    }, []);
};

export const updateTransactionPayload = (
  transaction: MultisigTransaction,
  pendingTransaction: PendingMultisigTransaction,
  signatories: Signatory[],
): MultisigTransaction => {
  const { events } = transaction;
  const {
    params: { when, deposit, depositor },
  } = pendingTransaction;

  const newApprovals = pendingTransaction.params.approvals.reduce<MultisigEvent[]>((acc, a) => {
    const hasApprovalEvent = events.find((e) => e.status === 'SIGNED' && e.accountId === a.toHex());

    if (!hasApprovalEvent) {
      acc.push({
        status: 'SIGNED',
        accountId: a.toHex(),
      });
    }

    return acc;
  }, []);

  return {
    ...transaction,
    blockCreated: when.height.toNumber(),
    indexCreated: when.index.toNumber(),
    deposit: deposit.toString(),
    depositor: depositor.toHex(),
    events: [...events, ...newApprovals],
  };
};

export const createTransactionPayload = (
  pendingTransaction: PendingMultisigTransaction,
  chainId: ChainId,
  account: MultisigAccount,
  currentBlock: number,
  blockTime: number,
): MultisigTransaction => {
  const {
    callHash,
    params: { when, approvals, deposit, depositor },
  } = pendingTransaction;

  const events: MultisigEvent[] = approvals.map((a) => ({
    status: 'SIGNED',
    accountId: account.signatories.find((s) => s.accountId === a.toHuman())?.publicKey || a.toHex(),
  }));

  const dateCreated = Date.now() - (currentBlock - when.height.toNumber()) * blockTime;

  return {
    blockCreated: when.height.toNumber(),
    indexCreated: pendingTransaction.params.when.index.toNumber(),
    dateCreated,
    chainId: chainId,
    status: MultisigTxInitStatus.SIGNING,
    callHash: callHash.toHex(),
    signatories: account.signatories,
    deposit: deposit.toString(),
    depositor: depositor.toHex(),
    publicKey: account.publicKey || '0x',
    events,
  };
};
