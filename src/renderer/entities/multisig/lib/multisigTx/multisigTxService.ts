import { type ApiPromise } from '@polkadot/api';
import { useLiveQuery } from 'dexie-react-hooks';

import { chainsService } from '@/shared/api/network';
import { type MultisigTransactionDS, storage } from '@/shared/api/storage';
import {
  type AccountId,
  type CallData,
  type MultisigAccount,
  type MultisigTransaction,
  MultisigTxFinalStatus,
  MultisigTxInitStatus,
} from '@/shared/core';
import { type Task } from '@/shared/lib/hooks/useTaskQueue';
import { getCurrentBlockNumber, getExpectedBlockTime, toAddress, validateCallData } from '@/shared/lib/utils';
import { useCallDataDecoder } from '@/entities/transaction';
import { useMultisigEvent } from '../multisigEvent/multisigEventService';

import { DEFAULT_BLOCK_HASH, MULTISIG_EXTRINSIC_CALL_INDEX, QUERY_INTERVAL } from './common/consts';
import { type IMultisigTxService } from './common/types';
import {
  createEventsPayload,
  createNewEventsPayload,
  createTransactionPayload,
  getPendingMultisigTxs,
  updateOldEventsPayload,
  updateTransactionPayload,
} from './common/utils';

type Props = {
  addTask?: (task: Task) => void;
};

export const useMultisigTx = ({ addTask }: Props): IMultisigTxService => {
  const transactionStorage = storage.connectTo('multisigTransactions');

  if (!transactionStorage) {
    throw new Error('=== 🔴 MultisigTransactions storage in not defined 🔴 ===');
  }
  const { getMultisigTx, getMultisigTxs, getAccountMultisigTxs, addMultisigTx, updateMultisigTx, deleteMultisigTx } =
    transactionStorage;
  const { decodeCallData } = useCallDataDecoder();
  const { addEventWithQueue, getEvents, updateEvent } = useMultisigEvent({ addTask });

  const subscribeMultisigAccount = (api: ApiPromise, account: MultisigAccount): (() => void) => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const subscribeFn = async () => {
      // TODO: Use mutex to avoid events doubling
      const pendingTxs = await getPendingMultisigTxs(api, account.accountId);
      const currentBlockNumber = await getCurrentBlockNumber(api);
      const blockTime = getExpectedBlockTime(api);
      const transactions = await getMultisigTxs({ accountId: account.accountId, status: MultisigTxInitStatus.SIGNING });

      for (const pendingTx of pendingTxs) {
        const oldTx = transactions.find((t) => {
          return (
            t.callHash === pendingTx.callHash.toHex() &&
            t.blockCreated === pendingTx.params.when.height.toNumber() &&
            t.indexCreated === pendingTx.params.when.index.toNumber() &&
            t.chainId === api.genesisHash.toHex()
          );
        });

        if (oldTx) {
          const newestOldTx = await getMultisigTx(
            oldTx.accountId,
            oldTx.chainId,
            oldTx.callHash,
            oldTx.blockCreated,
            oldTx.indexCreated,
          );

          if (!newestOldTx) continue;

          const updatedTx = updateTransactionPayload(newestOldTx, pendingTx);

          const oldEvents = await getEvents({
            txAccountId: oldTx.accountId,
            txChainId: oldTx.chainId,
            txCallHash: oldTx.callHash,
            txBlock: oldTx.blockCreated,
            txIndex: oldTx.indexCreated,
          });

          const newEvents = createNewEventsPayload(oldEvents, newestOldTx, pendingTx.params.approvals);
          for (const e of newEvents) {
            addEventWithQueue(e);
          }

          const updatedEvents = updateOldEventsPayload(oldEvents, pendingTx.params.approvals);
          updatedEvents.forEach(updateEvent);

          if (updatedTx) {
            updateMultisigTx(updatedTx).then(() => {
              console.log(
                `Multisig transaction was updated with ${updatedTx.callHash} and timepoint ${updatedTx.blockCreated}-${updatedTx.indexCreated}`,
              );
            });
          }
        } else {
          const depositor = pendingTx.params.depositor.toHex();
          if (!account.signatories.find((s) => s.accountId == depositor)) continue;

          const newTx = createTransactionPayload(
            pendingTx,
            api.genesisHash.toHex(),
            account,
            currentBlockNumber,
            blockTime.toNumber(),
          );

          const freshOldTx = await getMultisigTx(
            newTx.accountId,
            newTx.chainId,
            newTx.callHash,
            newTx.blockCreated,
            newTx.indexCreated,
          );

          if (freshOldTx) continue;

          addMultisigTx(newTx);

          const newEvents = createEventsPayload(newTx, pendingTx, account, currentBlockNumber, blockTime.toNumber());
          for (const e of newEvents) {
            addEventWithQueue(e);
          }

          console.log(
            `New pending multisig transaction was found in multisig.multisigs with call hash ${pendingTx.callHash}`,
          );
        }
      }

      for (const tx of transactions) {
        const hasTransaction = pendingTxs.find((t) => t.callHash.toHex() === tx.callHash);
        const isDifferentChain = tx.chainId !== api.genesisHash.toHex();

        if (hasTransaction || isDifferentChain) continue;

        const transaction = await getMultisigTx(
          tx.accountId,
          tx.chainId,
          tx.callHash,
          tx.blockCreated,
          tx.indexCreated,
        );

        if (['CANCELLED', 'SIGNED'].includes(transaction?.status || '')) continue;

        const events = await getEvents({
          txAccountId: tx.accountId,
          txChainId: tx.chainId,
          txCallHash: tx.callHash,
          txBlock: tx.blockCreated,
          txIndex: tx.indexCreated,
        });

        // FIXME: Second condition is for already signed tx
        const hasPendingFinalApproval = events.some((e) => e.status === 'PENDING_SIGNED');
        const hasPendingCancelled = events.some((e) => e.status === 'PENDING_CANCELLED');

        const status = hasPendingFinalApproval
          ? MultisigTxFinalStatus.EXECUTED
          : hasPendingCancelled
            ? MultisigTxFinalStatus.CANCELLED
            : tx.status === 'SIGNING'
              ? MultisigTxFinalStatus.ESTABLISHED
              : tx.status;

        updateMultisigTx({ ...tx, status }).then(() => {
          console.log(
            `Multisig transaction was updated with call hash ${tx.callHash} and timepoint ${tx.blockCreated}-${tx.indexCreated} and status ${status}`,
          );
        });
      }

      timeoutId = setTimeout(subscribeFn, QUERY_INTERVAL);
    };

    subscribeFn();

    return () => clearTimeout(timeoutId);
  };

  const getLiveMultisigTxs = <T extends MultisigTransaction>(where?: Partial<T>): MultisigTransactionDS[] => {
    const query = () => {
      try {
        return getMultisigTxs(where);
      } catch {
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
      } catch {
        console.warn('Error trying to get multisig transactions');

        return Promise.resolve([]);
      }
    };

    return useLiveQuery(query, [accountIds.length, accountIds.length > 0 && accountIds[0]], []);
  };

  const updateCallData = async (api: ApiPromise, tx: MultisigTransaction, callData: CallData) => {
    try {
      const chain = chainsService.getChainById(tx.chainId);

      const transaction = decodeCallData(api, toAddress(tx.accountId, { prefix: chain?.addressPrefix }), callData);

      await updateMultisigTx({ ...tx, callData, transaction });
    } catch (e) {
      console.log('Error during update callData: ', e);
    }
  };

  const updateCallDataFromChain = async (
    api: ApiPromise,
    tx: MultisigTransaction,
    blockHeight: number,
    extrinsicIndex: number,
  ) => {
    try {
      const blockHash = await api.rpc.chain.getBlockHash(blockHeight);
      if (blockHash.toHex() === DEFAULT_BLOCK_HASH) return;

      const { block } = await api.rpc.chain.getBlock(blockHash);
      const extrinsic = block.extrinsics[extrinsicIndex];

      if (!extrinsic.argsDef.call) return;

      const callData = extrinsic.args[MULTISIG_EXTRINSIC_CALL_INDEX].toHex();

      if (!validateCallData(callData, tx.callHash)) return;

      updateCallData(api, tx, callData);
    } catch (e) {
      console.log('Error during update call data from chain', e);
    }
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
    updateCallDataFromChain,
  };
};
