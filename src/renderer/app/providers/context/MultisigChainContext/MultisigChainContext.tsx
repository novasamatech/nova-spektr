import { type VoidFn } from '@polkadot/api/types';
import { type Event } from '@polkadot/types/interfaces';
import { useGate, useUnit } from 'effector-react';
import { type PropsWithChildren, createContext, useContext, useEffect } from 'react';

import { type ChainId, type MultisigAccount, MultisigTxFinalStatus, type SigningStatus } from '@/shared/core';
import { useDebounce, useTaskQueue } from '@/shared/lib/hooks';
import { type Task } from '@/shared/lib/hooks/useTaskQueue';
import { getCreatedDateFromApi, toAddress } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { subscriptionService } from '@/entities/chain';
import { useMultisigEvent, useMultisigTx } from '@/entities/multisig';
import { networkModel, networkUtils } from '@/entities/network';
import { operationsModel } from '@/entities/operations';
import { accountUtils, walletModel } from '@/entities/wallet';

type MultisigChainContextProps = {
  addTask: (task: Task) => void;
};

const MULTISIG_RESULT_SUCCESS = 'Ok';
const MULTISIG_RESULT_ERROR = 'err';

const MultisigChainContext = createContext<MultisigChainContextProps>({} as MultisigChainContextProps);

export const MultisigChainProvider = ({ children }: PropsWithChildren) => {
  const taskQueue = useTaskQueue();
  const {
    subscribeMultisigAccount,
    updateMultisigTx,
    getMultisigTx,
    getLiveAccountMultisigTxs,
    updateCallData,
    updateCallDataFromChain,
  } = useMultisigTx(taskQueue);
  const activeWallet = useUnit(walletModel.$activeWallet);
  const apis = useUnit(networkModel.$apis);
  const chains = useUnit(networkModel.$chains);
  const connectionStatuses = useUnit(networkModel.$connectionStatuses);

  const { updateEvent, getEvents, addEventWithQueue, getLiveEventsByKeys } = useMultisigEvent(taskQueue);

  const debouncedApis = useDebounce(apis, 1000);
  const debouncedConnectionStatuses = useDebounce(connectionStatuses, 1000);

  const activeAccount = activeWallet?.accounts[0];
  const account = activeAccount && accountUtils.isMultisigAccount(activeAccount) ? activeAccount : undefined;

  const txs = getLiveAccountMultisigTxs(account?.accountId ? [account.accountId] : []);
  const events = getLiveEventsByKeys(txs);

  useGate(operationsModel.gate.flow, {
    transactions: txs,
    events,
  });

  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax
    txs.forEach(async (tx) => {
      const api = apis[tx.chainId];

      if (!api) return;

      if (tx.callData && !tx.transaction) {
        updateCallData(api, tx, tx.callData);
      }

      if (tx.blockCreated && tx.indexCreated && !tx.callData && !tx.transaction) {
        updateCallDataFromChain(api, tx, tx.blockCreated, tx.indexCreated);
      }

      if (!tx.dateCreated && tx.blockCreated) {
        const dateCreated = await getCreatedDateFromApi(tx.blockCreated, api);
        updateMultisigTx({ ...tx, dateCreated });

        const events = await getEvents({
          txAccountId: tx.accountId,
          txChainId: tx.chainId,
          txCallHash: tx.callHash,
          txBlock: tx.blockCreated,
          txIndex: tx.indexCreated,
          status: 'SIGNED',
          accountId: tx.depositor,
        });

        if (events[0]) {
          updateEvent({ ...events[0], dateCreated });
        }

        console.log(`Create date recovered for multisig tx ${tx.callHash}`);
      }
    });
  }, [txs, debouncedApis]);

  const eventCallback = async (
    account: MultisigAccount,
    chainId: ChainId,
    event: Event,
    pendingEventStatuses: SigningStatus[],
    resultEventStatus: SigningStatus,
    resultTransactionStatus: MultisigTxFinalStatus,
  ): Promise<void> => {
    const callHash = event.data[3].toHex();
    const blockCreated = (event.data[1] as any).height.toNumber();
    const indexCreated = (event.data[1] as any).index.toNumber();

    const tx = await getMultisigTx(account.accountId, chainId, callHash, blockCreated, indexCreated);

    if (!tx) return;

    const accountId = pjsSchema.helpers.toAccountId(event.data[0].toHex());

    addEventWithQueue(
      {
        txAccountId: account.accountId,
        txChainId: chainId,
        txCallHash: callHash,
        txBlock: blockCreated,
        txIndex: indexCreated,
        status: resultEventStatus,
        accountId,
        dateCreated: Date.now(),
      },
      pendingEventStatuses,
    );

    await updateMultisigTx({ ...tx, status: resultTransactionStatus });

    console.log(
      `Transaction with call hash ${tx.callHash} and timepoint ${tx.blockCreated}-${tx.indexCreated} was updated`,
    );
  };

  const availableConnectionsAmount = Object.values(debouncedConnectionStatuses).filter(
    networkUtils.isConnectedStatus,
  ).length;

  useEffect(() => {
    const unsubscribeMultisigs: (() => void)[] = [];
    const unsubscribeEvents: VoidFn[] = [];

    // eslint-disable-next-line no-restricted-syntax
    Object.entries(apis).forEach(async ([chainId, api]) => {
      const chain = chains[chainId as ChainId];
      const addressPrefix = chain?.addressPrefix;

      if (!api?.query.multisig || !account || !addressPrefix?.toString()) return;

      const unsubscribeMultisig = subscribeMultisigAccount(api, account as MultisigAccount);
      unsubscribeMultisigs.push(unsubscribeMultisig);

      const successParams = {
        section: 'multisig',
        method: 'MultisigExecuted',
        data: [undefined, undefined, toAddress(account.accountId, { prefix: addressPrefix })],
      };

      const unsubscribeSuccessEvent = await subscriptionService.subscribeEvents(api, successParams, (event: Event) => {
        console.log(
          `Receive MultisigExecuted event for ${
            account.accountId
          } with call hash ${event.data[3].toHex()} with result ${event.data[4]}`,
        );

        const multisigResult = event.data[4].toString();
        eventCallback(
          account as MultisigAccount,
          api.genesisHash.toHex(),
          event,
          ['PENDING_SIGNED', 'SIGNED'],
          'SIGNED',
          multisigResult === MULTISIG_RESULT_SUCCESS && !multisigResult.includes(MULTISIG_RESULT_ERROR)
            ? MultisigTxFinalStatus.EXECUTED
            : MultisigTxFinalStatus.ERROR,
        ).catch(console.warn);
      });
      unsubscribeEvents.push(unsubscribeSuccessEvent);

      const cancelParams = {
        section: 'multisig',
        method: 'MultisigCancelled',
        data: [undefined, undefined, toAddress(account.accountId, { prefix: addressPrefix })],
      };
      const unsubscribeCancelEvent = await subscriptionService.subscribeEvents(api, cancelParams, (event: Event) => {
        console.log(`Receive MultisigCancelled event for ${account.accountId} with call hash ${event.data[3].toHex()}`);

        eventCallback(
          account as MultisigAccount,
          api.genesisHash.toHex(),
          event,
          ['PENDING_CANCELLED', 'CANCELLED'],
          'CANCELLED',
          MultisigTxFinalStatus.CANCELLED,
        ).catch(console.warn);
      });

      unsubscribeEvents.push(unsubscribeCancelEvent);
    });

    return () => {
      for (const unsubscribe of unsubscribeMultisigs) {
        unsubscribe();
      }
      for (const unsubscribe of unsubscribeEvents) {
        unsubscribe();
      }
    };
  }, [availableConnectionsAmount, account]);

  return <MultisigChainContext.Provider value={taskQueue}>{children}</MultisigChainContext.Provider>;
};

export const useMultisigChainContext = () => useContext<MultisigChainContextProps>(MultisigChainContext);
