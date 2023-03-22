import { ApiPromise } from '@polkadot/api';

import { MultisigAccount } from '@renderer/domain/account';
import { ChainId } from '@renderer/domain/shared-kernel';
import { Signatory } from '@renderer/domain/signatory';
import { MultisigEvent, MultisigTransaction } from '@renderer/domain/transaction';
import { toAddress } from '../balance/common/utils';
import { PendingMultisigTransaction } from './common/types';

export const getPendingMultisigTxs = async (
  api: ApiPromise,
  address: string,
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

export const isSameTransaction = (
  transaction: MultisigTransaction,
  multisigTransaction: PendingMultisigTransaction,
) => {
  return multisigTransaction.callHash.toString() === transaction.callHash?.toString();
};

export const updateTransactionPayload = (
  transaction: MultisigTransaction,
  pendingTransaction: PendingMultisigTransaction,
  signatories: Signatory[],
): MultisigTransaction => {
  const { events } = transaction;

  const newApprovals = pendingTransaction.params.approvals.reduce<MultisigEvent[]>((acc, a) => {
    if (events.find((e) => e.status === 'SIGNED' && e.signatory.publicKey === a.toHex())) return acc;

    return [
      ...acc,
      {
        status: 'SIGNED',
        signatory: signatories.find((s) => s.publicKey === a.toHex()) || {
          name: toAddress(a.toHex()),
          publicKey: a.toHex(),
          accountId: toAddress(a.toHex()),
        },
      },
    ];
  }, []);

  return {
    ...transaction,
    blockCreated: pendingTransaction.params.when.height.toNumber(),
    indexCreated: pendingTransaction.params.when.index.toNumber(),
    deposit: pendingTransaction.params.deposit.toString(),
    depositor: pendingTransaction.params.depositor.toHex(),
    events: [...events, ...newApprovals],
  };
};

export const createTransactionPayload = (
  pendingTransaction: PendingMultisigTransaction,
  chainId: ChainId,
  account: MultisigAccount,
): MultisigTransaction => {
  const {
    callHash,
    params: { when, approvals, deposit, depositor },
  } = pendingTransaction;

  const events: MultisigEvent[] = approvals.map((a) => ({
    status: 'SIGNED',
    signatory: account.signatories.find((s) => s.accountId === a.toHuman()) || {
      name: toAddress(a.toHex()),
      publicKey: a.toHex(),
      accountId: toAddress(a.toHex()),
    },
  }));

  return {
    blockCreated: when.height.toNumber(),
    indexCreated: pendingTransaction.params.when.index.toNumber(),
    chainId: chainId,
    status: 'SIGNING',
    callHash: callHash.toHex(),
    signatories: account.signatories,
    deposit: deposit.toString(),
    depositor: depositor.toHex(),
    publicKey: account.publicKey || '0x',
    events,
  };
};

// export const updateTimepointFromBlockchain = async (transaction: Transaction, connection: Connection) => {
//   if (!transaction || !connection) return;

//   const multisigTransaction = await connection.api.query.multisig.multisigs(
//     getAddressFromWallet(transaction.wallet, connection.network),
//     transaction.data.callHash as string,
//   );
//   if (multisigTransaction.isNone) return;

//   const pendingTransaction = multisigTransaction.unwrap();

//   if (!pendingTransaction) return;

//   db.transactions.put({
//     ...transaction,
//     blockHeight: pendingTransaction.when.height.toNumber(),
//     blockHash: pendingTransaction.when.hash.toHex(),
//     extrinsicIndex: pendingTransaction.when.index.toNumber(),
//   });
// };
