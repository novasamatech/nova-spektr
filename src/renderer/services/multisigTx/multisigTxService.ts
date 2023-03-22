import { ApiPromise } from '@polkadot/api';

import { MultisigAccount } from '@renderer/domain/account';
import { MiltisigTransactionFinalStatus } from '@renderer/domain/transaction';
import storage from '../storage';
import { QUERY_INTERVAL } from './common/consts';
import { IMultisigTxService } from './common/types';
import { createTransactionPayload, getPendingMultisigTxs, updateTransactionPayload } from './multisigTxUtils';

export const useMultisigTx = (): IMultisigTxService => {
  const transactionStorage = storage.connectTo('multisigTransactions');

  if (!transactionStorage) {
    throw new Error('=== 🔴 Contact storage in not defined 🔴 ===');
  }
  const { getTx, getTxs, addTx, updateTx, deleteTx } = transactionStorage;

  const subscribeMultisigAccount = (api: ApiPromise, account: MultisigAccount): (() => void) => {
    const intervalId = setInterval(async () => {
      const transactions = await getTxs({ publicKey: account.publicKey });
      const pendingTxs = await getPendingMultisigTxs(api, account.accountId as string);

      pendingTxs.forEach((pendingTx) => {
        const oldTx = transactions.find(
          (t) =>
            t.callHash === pendingTx.callHash.toHex() &&
            t.blockCreated === pendingTx.params.when.height.toNumber() &&
            t.indexCreated === pendingTx.params.when.index.toNumber() &&
            t.chainId === api.genesisHash.toHex() &&
            t.status === 'SIGNING',
        );

        if (!oldTx) {
          addTx(createTransactionPayload(pendingTx, api.genesisHash.toHex(), account));

          return;
        }

        updateTx(updateTransactionPayload(oldTx, pendingTx, account.signatories));
      });

      transactions.forEach((tx) => {
        const hasTransaction = pendingTxs.find((t) => t.callHash.toHex() === tx.callHash);

        if (hasTransaction || tx.chainId !== api.genesisHash.toHex()) return;

        // FIXME: Second condigion is for already signed tx
        const hasPendingFinalApproval = tx.events.some((e) => e.status === 'PENDING_SIGNED');
        const hasPendingCancelled = tx.events.some((e) => e.status === 'PENDING_CANCELLED' || e.status === 'CANCELLED');

        const status = hasPendingFinalApproval
          ? MiltisigTransactionFinalStatus.SUCCESS
          : hasPendingCancelled
          ? MiltisigTransactionFinalStatus.CANCELLED
          : MiltisigTransactionFinalStatus.ESTABLISHED;

        updateTx({
          ...tx,
          status,
        });
      });
    }, QUERY_INTERVAL);

    return () => clearInterval(intervalId);
  };

  return {
    subscribeMultisigAccount,
    getTx,
    getTxs,
    addTx,
    updateTx,
    deleteTx,
  };
};
