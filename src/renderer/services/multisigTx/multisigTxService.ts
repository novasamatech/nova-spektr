import { ApiPromise } from '@polkadot/api';
import { useLiveQuery } from 'dexie-react-hooks';

import { MultisigAccount } from '@renderer/domain/account';
import { MultisigTxFinalStatus, MultisigTransaction, MultisigTxInitStatus } from '@renderer/domain/transaction';
import storage, { MultisigTransactionDS } from '../storage';
import { QUERY_INTERVAL } from './common/consts';
import { IMultisigTxService } from './common/types';
import { createTransactionPayload, getPendingMultisigTxs, updateTransactionPayload } from './common/utils';
import { useChains } from '../network/chainsService';
import { useTransaction } from '../transaction/transactionService';
import { CallData, AccountId } from '@renderer/domain/shared-kernel';
import { toAddress } from '@renderer/shared/utils/address';
import { getCurrentBlockNumber, getExpectedBlockTime } from '@renderer/shared/utils/substrate';

export const useMultisigTx = (): IMultisigTxService => {
  const transactionStorage = storage.connectTo('multisigTransactions');

  if (!transactionStorage) {
    throw new Error('=== 🔴 MultisigTransactions storage in not defined 🔴 ===');
  }
  const { getMultisigTx, getMultisigTxs, getAccountMultisigTxs, addMultisigTx, updateMultisigTx, deleteMultisigTx } =
    transactionStorage;
  const { getChainById } = useChains();
  const { decodeCallData } = useTransaction();

  const subscribeMultisigAccount = (api: ApiPromise, account: MultisigAccount): (() => void) => {
    const intervalId = setInterval(async () => {
      //
      const transactions = await getMultisigTxs({ accountId: account.accountId, status: MultisigTxInitStatus.SIGNING });
      const pendingTxs = await getPendingMultisigTxs(api, account.accountId);
      const currentBlockNumber = await getCurrentBlockNumber(api);
      const blockTime = getExpectedBlockTime(api);

      pendingTxs.forEach((pendingTx) => {
        const oldTx = transactions.find(
          (t) =>
            t.callHash === pendingTx.callHash.toHex() &&
            t.blockCreated === pendingTx.params.when.height.toNumber() &&
            t.indexCreated === pendingTx.params.when.index.toNumber() &&
            t.chainId === api.genesisHash.toHex(),
        );

        if (oldTx) {
          const updatedTx = updateTransactionPayload(oldTx, pendingTx);

          if (updatedTx) {
            updateMultisigTx(updatedTx);
            console.log(
              `Multisig transaction was updated with ${updatedTx.callHash} and timepoint ${updatedTx.blockCreated}-${updatedTx.indexCreated}`,
            );
          }
        } else {
          const depositor = pendingTx.params.depositor.toHex();
          if (!account.signatories.find((s) => s.accountId == depositor)) return;

          addMultisigTx(
            createTransactionPayload(
              pendingTx,
              api.genesisHash.toHex(),
              account,
              currentBlockNumber,
              blockTime.toNumber(),
            ),
          );
          console.log(`New pending multisig transaction was found with call hash ${pendingTx.callHash}`);
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
        console.log(
          `Multisig transaction was updated with call hash ${tx.callHash} and timepoint ${tx.blockCreated}-${tx.indexCreated} and status ${status}`,
        );
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

  const getLiveAccountMultisigTxs = (accountIds: AccountId[]): MultisigTransactionDS[] => {
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
