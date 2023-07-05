import { ApiPromise } from '@polkadot/api';
import { useLiveQuery } from 'dexie-react-hooks';

import { MultisigAccount } from '@renderer/domain/account';
import { MultisigTransaction, MultisigTxFinalStatus, MultisigTxInitStatus } from '@renderer/domain/transaction';
import storage, { MultisigTransactionDS } from '../storage';
import { QUERY_INTERVAL } from './common/consts';
import { IMultisigTxService } from './common/types';
import {
  createTransactionPayload,
  getPendingMultisigTxs,
  createEventsPayload,
  updateTransactionPayload,
  createNewEventsPayload,
  updateOldEventsPayload,
} from './common/utils';
import { useChains } from '../network/chainsService';
import { useTransaction } from '../transaction/transactionService';
import { CallData, AccountId } from '@renderer/domain/shared-kernel';
import { toAddress } from '@renderer/shared/utils/address';
import { getCurrentBlockNumber, getExpectedBlockTime } from '@renderer/shared/utils/substrate';
import { useMultisigEvent } from '../multisigEvent/multisigEventService';

export const useMultisigTx = (): IMultisigTxService => {
  const transactionStorage = storage.connectTo('multisigTransactions');

  if (!transactionStorage) {
    throw new Error('=== 🔴 MultisigTransactions storage in not defined 🔴 ===');
  }
  const { getMultisigTx, getMultisigTxs, getAccountMultisigTxs, addMultisigTx, updateMultisigTx, deleteMultisigTx } =
    transactionStorage;
  const { getChainById } = useChains();
  const { decodeCallData } = useTransaction();
  const { addEvent, getEvents, updateEvent } = useMultisigEvent();

  const subscribeMultisigAccount = (api: ApiPromise, account: MultisigAccount): (() => void) => {
    const intervalId = setInterval(async () => {
      const transactions = await getMultisigTxs({ accountId: account.accountId, status: MultisigTxInitStatus.SIGNING });
      const pendingTxs = await getPendingMultisigTxs(api, account.accountId);
      const currentBlockNumber = await getCurrentBlockNumber(api);
      const blockTime = getExpectedBlockTime(api);

      pendingTxs.forEach(async (pendingTx) => {
        const oldTx = transactions.find(
          (t) =>
            t.callHash === pendingTx.callHash.toHex() &&
            t.blockCreated === pendingTx.params.when.height.toNumber() &&
            t.indexCreated === pendingTx.params.when.index.toNumber() &&
            t.chainId === api.genesisHash.toHex(),
        );

        if (oldTx) {
          const updatedTx = updateTransactionPayload(oldTx, pendingTx);
          const oldEvents = await getEvents({
            txAccountId: oldTx.accountId,
            txChainId: oldTx.chainId,
            txCallHash: oldTx.callHash,
            txBlock: oldTx.blockCreated,
            txIndex: oldTx.indexCreated,
          });

          const newEvents = createNewEventsPayload(oldEvents, oldTx, pendingTx);
          newEvents.forEach((e) => addEvent(e));

          const updatedEvents = updateOldEventsPayload(oldEvents, pendingTx);
          updatedEvents.forEach((e) => updateEvent(e));

          if (updatedTx) {
            updateMultisigTx(updatedTx);
            console.log(
              `Multisig transaction was updated with ${updatedTx.callHash} and timepoint ${updatedTx.blockCreated}-${updatedTx.indexCreated}`,
            );
          }
        } else {
          const depositor = pendingTx.params.depositor.toHex();
          if (!account.signatories.find((s) => s.accountId == depositor)) return;

          const newTx = createTransactionPayload(
            pendingTx,
            api.genesisHash.toHex(),
            account,
            currentBlockNumber,
            blockTime.toNumber(),
          );
          addMultisigTx(newTx);

          const newEvents = createEventsPayload(newTx, pendingTx, account, currentBlockNumber, blockTime.toNumber());
          newEvents.forEach((e) => addEvent(e));

          console.log(`New pending multisig transaction was found with call hash ${pendingTx.callHash}`);
        }
      });

      transactions.forEach(async (tx) => {
        const hasTransaction = pendingTxs.find((t) => t.callHash.toHex() === tx.callHash);
        const isDifferentChain = tx.chainId !== api.genesisHash.toHex();

        if (hasTransaction || isDifferentChain) return;

        const events = await getEvents({
          txAccountId: tx.accountId,
          txChainId: tx.chainId,
          txCallHash: tx.callHash,
          txBlock: tx.blockCreated,
          txIndex: tx.indexCreated,
        });

        // FIXME: Second condition is for already signed tx
        const hasPendingFinalApproval = events.some((e) => e.status === 'PENDING_SIGNED');
        const hasPendingCancelled = events.some((e) => e.status === 'PENDING_CANCELLED' || e.status === 'CANCELLED');

        const status = hasPendingFinalApproval
          ? MultisigTxFinalStatus.EXECUTED
          : hasPendingCancelled
          ? MultisigTxFinalStatus.CANCELLED
          : tx.status === 'SIGNING'
          ? MultisigTxFinalStatus.ESTABLISHED
          : tx.status;

        updateMultisigTx(tx);
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

    return useLiveQuery(query, [accountIds.length, accountIds.length > 0 && accountIds[0]], []);
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
