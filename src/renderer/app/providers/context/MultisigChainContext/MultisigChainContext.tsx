import { createContext, PropsWithChildren, useContext, useEffect } from 'react';
import { VoidFn } from '@polkadot/api/types';
import { Event } from '@polkadot/types/interfaces';

import { useChainSubscription } from '@renderer/entities/chain';
import { useNetworkContext } from '../NetworkContext';
import { useMultisigTx, useMultisigEvent } from '@renderer/entities/multisig';
import { useAccount, MultisigAccount } from '@renderer/entities/account';
import { MultisigTxFinalStatus, SigningStatus } from '@renderer/entities/transaction';
import { toAddress, getCreatedDateFromApi } from '@renderer/shared/lib/utils';
import { ChainId } from '@renderer/domain/shared-kernel';
import { useDebounce, useTaskQueue } from '@renderer/shared/lib/hooks';
import { ConnectionStatus } from '@renderer/domain/connection';
import { Task } from '@renderer/shared/lib/hooks/useTaskQueue';

type MultisigChainContextProps = {
  addTask: (task: Task) => void;
};

const MULTISIG_RESULT_SUCCESS: string = 'Ok';
const MULTISIG_RESULT_ERROR: string = 'err';

const MultisigChainContext = createContext<MultisigChainContextProps>({} as MultisigChainContextProps);

export const MultisigChainProvider = ({ children }: PropsWithChildren) => {
  const { connections } = useNetworkContext();
  const { addTask } = useTaskQueue();
  const {
    subscribeMultisigAccount,
    updateMultisigTx,
    getMultisigTx,
    getLiveAccountMultisigTxs,
    updateCallData,
    updateCallDataFromChain,
  } = useMultisigTx({ addTask });
  const { getActiveMultisigAccount } = useAccount();
  const { updateEvent, getEvents, addEventWithQueue } = useMultisigEvent({ addTask });

  const { subscribeEvents } = useChainSubscription();
  const debouncedConnections = useDebounce(connections, 1000);

  const account = getActiveMultisigAccount();

  const txs = getLiveAccountMultisigTxs(account?.accountId ? [account.accountId] : []);

  useEffect(() => {
    txs.forEach(async (tx) => {
      const connection = connections[tx.chainId];

      if (!connection?.api) return;

      if (tx.callData && !tx.transaction) {
        updateCallData(connection.api, tx, tx.callData);
      }

      if (tx.blockCreated && tx.indexCreated && !tx.transaction) {
        updateCallDataFromChain(connection.api, tx, tx.blockCreated, tx.indexCreated);
      }

      if (!tx.dateCreated && tx.blockCreated) {
        const dateCreated = await getCreatedDateFromApi(tx.blockCreated, connection.api);
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
  }, [txs, debouncedConnections]);

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

    const accountId = event.data[0].toHex();

    await addEventWithQueue(
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

  const availableConnectionsAmount = Object.values(debouncedConnections).filter(
    (c) => c.connection.connectionStatus === ConnectionStatus.CONNECTED,
  ).length;

  useEffect(() => {
    const unsubscribeMultisigs: (() => void)[] = [];
    const unsubscribeEvents: VoidFn[] = [];

    Object.values(connections).forEach(async ({ api, addressPrefix }) => {
      if (!api?.query.multisig || !account) return;

      const unsubscribeMultisig = subscribeMultisigAccount(api, account as MultisigAccount);
      unsubscribeMultisigs.push(unsubscribeMultisig);

      const successParams = {
        section: 'multisig',
        method: 'MultisigExecuted',
        data: [undefined, undefined, toAddress(account.accountId, { prefix: addressPrefix })],
      };

      const unsubscribeSuccessEvent = await subscribeEvents(api, successParams, (event: Event) => {
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
      const unsubscribeCancelEvent = await subscribeEvents(api, cancelParams, (event: Event) => {
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
      unsubscribeMultisigs.forEach((unsubscribe) => unsubscribe());
      unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
    };
  }, [availableConnectionsAmount, account]);

  return <MultisigChainContext.Provider value={{ addTask }}>{children}</MultisigChainContext.Provider>;
};

export const useMultisigChainContext = () => useContext<MultisigChainContextProps>(MultisigChainContext);
