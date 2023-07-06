import { createContext, PropsWithChildren, useContext, useEffect } from 'react';
import { VoidFn } from '@polkadot/api/types';
import { Event } from '@polkadot/types/interfaces';

import { useChainSubscription } from '@renderer/services/chainSubscription/chainSubscriptionService';
import { useNetworkContext } from '../NetworkContext';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { useAccount } from '@renderer/services/account/accountService';
import { MultisigAccount } from '@renderer/domain/account';
import { MultisigTxFinalStatus, SigningStatus } from '@renderer/domain/transaction';
import { toAddress } from '@renderer/shared/utils/address';
import { ChainId } from '@renderer/domain/shared-kernel';
import { useDebounce } from '@renderer/shared/hooks';
import { useMultisigEvent } from '@renderer/services/multisigEvent/multisigEventService';
// import { ConnectionStatus } from '@renderer/domain/connection';

type MultisigChainContextProps = {};

const MULTISIG_RESULT_SUCCESS: string = 'Ok';
const MULTISIG_RESULT_ERROR: string = 'err';

const MultisigChainContext = createContext<MultisigChainContextProps>({} as MultisigChainContextProps);

export const MultisigChainProvider = ({ children }: PropsWithChildren) => {
  const { connections } = useNetworkContext();
  const { subscribeMultisigAccount, updateMultisigTx, getMultisigTx, getLiveAccountMultisigTxs, updateCallData } =
    useMultisigTx();
  const { getActiveMultisigAccount } = useAccount();
  const { updateEvent, addEvent, getEvents } = useMultisigEvent();

  const { subscribeEvents } = useChainSubscription();
  const debouncedConnections = useDebounce(connections, 1000);

  const account = getActiveMultisigAccount();

  const txs = getLiveAccountMultisigTxs(account?.accountId ? [account.accountId] : []);

  useEffect(() => {
    txs.forEach(async (tx) => {
      const connection = connections[tx.chainId];

      if (connection?.api && tx.callData && !tx.transaction) {
        updateCallData(connection.api, tx, tx.callData);
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

    const events = await getEvents({
      txAccountId: account.accountId,
      txChainId: chainId,
      txCallHash: callHash,
      txBlock: blockCreated,
      txIndex: indexCreated,
    });

    const pendingEvent = events.find(
      (event) => pendingEventStatuses.includes(event.status) && event.accountId === accountId,
    );

    if (pendingEvent) {
      await updateEvent({ ...pendingEvent, status: resultEventStatus });
    } else {
      await addEvent({
        txAccountId: account.accountId,
        txChainId: chainId,
        txCallHash: callHash,
        txBlock: blockCreated,
        txIndex: indexCreated,
        status: resultEventStatus,
        accountId: event.data[0].toHex(),
        dateCreated: Date.now(),
      });
    }

    await updateMultisigTx({ ...tx, status: resultTransactionStatus });

    console.log(
      `Transaction with call hash ${tx.callHash} and timepoint ${tx.blockCreated}-${tx.indexCreated} was updated`,
    );
  };

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
  }, [debouncedConnections, account]);

  return <MultisigChainContext.Provider value={{}}>{children}</MultisigChainContext.Provider>;
};

export const useMultisigChainContext = () => useContext<MultisigChainContextProps>(MultisigChainContext);
