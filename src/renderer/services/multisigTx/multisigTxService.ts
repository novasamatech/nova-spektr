import { ApiPromise } from '@polkadot/api';
import { useLiveQuery } from 'dexie-react-hooks';

import { MultisigAccount } from '@renderer/domain/account';
import { MultisigTxFinalStatus, MultisigTxInitStatus, MultisigTransaction } from '@renderer/domain/transaction';
import storage, { MultisigTransactionDS } from '../storage';
import { QUERY_INTERVAL } from './common/consts';
import { IMultisigTxService } from './common/types';
import { createTransactionPayload, getPendingMultisigTxs, updateTransactionPayload } from './common/utils';
import { useChains } from '../network/chainsService';
import { useTransaction } from '../transaction/transactionService';
import { CallData, AccountID } from '@renderer/domain/shared-kernel';
import { toAddress } from '@renderer/shared/utils/address';

export const useMultisigTx = (): IMultisigTxService => {
  const transactionStorage = storage.connectTo('multisigTransactions');

  if (!transactionStorage) {
    throw new Error('=== 🔴 MultisigTransactions storage in not defined 🔴 ===');
  }
  const { getMultisigTx, getMultisigTxs, getAccountMultisigTxs, addMultisigTx, updateMultisigTx, deleteMultisigTx } =
    transactionStorage;
  const { getExpectedBlockTime, getChainById } = useChains();
  const { decodeCallData } = useTransaction();

  const subscribeMultisigAccount = (api: ApiPromise, account: MultisigAccount): (() => void) => {
    const intervalId = setInterval(async () => {
      const transactions = await getMultisigTxs({ accountId: account.accountId });
      const pendingTxs = await getPendingMultisigTxs(api, account.accountId);
      const { block } = await api.rpc.chain.getBlock();
      const currentBlockNumber = block.header.number.toNumber();

      pendingTxs.forEach((pendingTx) => {
        const oldTx = transactions.find(
          (t) =>
            t.callHash === pendingTx.callHash.toHex() &&
            t.blockCreated === pendingTx.params.when.height.toNumber() &&
            t.indexCreated === pendingTx.params.when.index.toNumber() &&
            t.chainId === api.genesisHash.toHex() &&
            t.status === MultisigTxInitStatus.SIGNING,
        );

        if (oldTx) {
          updateMultisigTx(updateTransactionPayload(oldTx, pendingTx));
        } else {
          const depositor = pendingTx.params.depositor.toHex();
          if (!account.signatories.find((s) => s.accountId == depositor)) return;

          const blockTime = getExpectedBlockTime(api);

          addMultisigTx(
            createTransactionPayload(
              pendingTx,
              api.genesisHash.toHex(),
              account,
              currentBlockNumber,
              blockTime.toNumber(),
            ),
          );
        }
      });

      transactions.forEach((tx) => {
        const hasTransaction = pendingTxs.find((t) => t.callHash.toHex() === tx.callHash);
        const isDifferentChain = tx.chainId !== api.genesisHash.toHex();

        if (hasTransaction || isDifferentChain) return;

        // FIXME: Second condition is for already signed tx
        const hasPendingFinalApproval = tx.events.some((e) => e.status === 'PENDING_SIGNED');
        const hasPendingCancelled = tx.events.some((e) => e.status === 'PENDING_CANCELLED' || e.status === 'CANCELLED');

        const status = hasPendingFinalApproval
          ? MultisigTxFinalStatus.EXECUTED
          : hasPendingCancelled
          ? MultisigTxFinalStatus.CANCELLED
          : tx.status === 'SIGNING'
          ? MultisigTxFinalStatus.ESTABLISHED
          : tx.status;

        updateMultisigTx({ ...tx, status });
      });
    }, QUERY_INTERVAL);

    return () => clearInterval(intervalId);
  };

  const getLiveMultisigTxs = <T extends MultisigTransaction>(where?: Partial<T>): MultisigTransactionDS[] => {
    const query = () => {
      try {
        return getMultisigTxs(where);
      } catch (error) {
        console.warn('Error trying to get multisig transactions');

        return Promise.resolve([]);
      }
    };

    return useLiveQuery(query, [where], []);
  };

  const getLiveAccountMultisigTxs = (accountIds: AccountID[]): MultisigTransactionDS[] => {
    const query = () => {
      try {
        return getAccountMultisigTxs(accountIds);
      } catch (error) {
        console.warn('Error trying to get multisig transactions');

        return Promise.resolve([]);
      }
    };

    return useLiveQuery(query, [accountIds.length], []);
  };

  const updateCallData = async (api: ApiPromise, tx: MultisigTransaction, callData: CallData) => {
    const chain = await getChainById(tx.chainId);

    const transaction = decodeCallData(api, toAddress(tx.accountId, { prefix: chain?.addressPrefix }), callData);

    await updateMultisigTx({ ...tx, callData, transaction });
  };

  return {
    subscribeMultisigAccount,
    getMultisigTx,
    getMultisigTxs,
    getAccountMultisigTxs,
    getLiveMultisigTxs,
    getLiveAccountMultisigTxs,
    addMultisigTx,
    updateMultisigTx,
    deleteMultisigTx,
    updateCallData,
  };
};
