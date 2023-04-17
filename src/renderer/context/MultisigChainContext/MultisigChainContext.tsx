import { createContext, PropsWithChildren, useContext, useEffect } from 'react';
import { UnsubscribePromise } from '@polkadot/api/types';
import { Event } from '@polkadot/types/interfaces';

import { useChainSubscription } from '@renderer/services/chainSubscription/chainSubscriptionService';
import { useNetworkContext } from '../NetworkContext';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { useAccount } from '@renderer/services/account/accountService';
import { MultisigAccount } from '@renderer/domain/account';
import { MultisigTxFinalStatus, SigningStatus } from '@renderer/domain/transaction';

type MultisigChainContextProps = {};

const MultisigChainContext = createContext<MultisigChainContextProps>({} as MultisigChainContextProps);

export const MultisigChainProvider = ({ children }: PropsWithChildren) => {
  const { connections } = useNetworkContext();
  const { subscribeMultisigAccount, updateMultisigTx, getMultisigTxs } = useMultisigTx();
  const { getActiveMultisigAccounts } = useAccount();
  const { subscribeEvents } = useChainSubscription();

  const accounts = getActiveMultisigAccounts();

  const eventCallback = async (
    account: MultisigAccount,
    event: Event,
    pendingEventStatuses: SigningStatus[],
    resultEventStatus: SigningStatus,
    resultTransactionStatus: MultisigTxFinalStatus,
  ): Promise<void> => {
    const txs = await getMultisigTxs({
      publicKey: account.publicKey,
      callHash: event.data[3].toHex(),
    });

    const lastTx = txs[txs.length - 1];
    if (!lastTx) return;

    const accountId = event.data[0].toHex();

    const newEvents = lastTx.events;
    const pendingEvent = newEvents.findIndex(
      (event) => pendingEventStatuses.includes(event.status) && event.accountId === accountId,
    );

    if (~pendingEvent) {
      newEvents[pendingEvent].status = resultEventStatus;
    } else {
      newEvents.push({
        status: resultEventStatus,
        accountId: event.data[0].toHex(),
        multisigOutcome: resultTransactionStatus,
      });
    }

    updateMultisigTx({
      ...lastTx,
      events: newEvents,
      status: resultTransactionStatus,
    });
  };

  useEffect(() => {
    const unsubscribeMultisigs: (() => void)[] = [];
    const unsubscribeEvents: UnsubscribePromise[] = [];

    Object.values(connections).forEach(({ api }) => {
      if (!api?.query.multisig) return;

      accounts.forEach((account) => {
        const unsubscribeMultisig = subscribeMultisigAccount(api, account as MultisigAccount);
        unsubscribeMultisigs.push(unsubscribeMultisig);

        const successParams = {
          section: 'multisig',
          method: 'MultisigExecuted',
          data: [undefined, undefined, account.accountId],
        };
        const unsubscribeSuccessEvent = subscribeEvents(api, successParams, (event: Event) => {
          eventCallback(
            account as MultisigAccount,
            event,
            ['PENDING_SIGNED', 'SIGNED'],
            'SIGNED',
            MultisigTxFinalStatus.EXECUTED,
          ).catch(console.warn);
        });
        unsubscribeEvents.push(unsubscribeSuccessEvent);

        const cancelParams = {
          section: 'multisig',
          method: 'MultisigCancelled',
          data: [undefined, undefined, account.accountId],
        };
        const unsubscribeCancelEvent = subscribeEvents(api, cancelParams, (event: Event) => {
          eventCallback(
            account as MultisigAccount,
            event,
            ['PENDING_CANCELLED', 'CANCELLED'],
            'CANCELLED',
            MultisigTxFinalStatus.CANCELLED,
          ).catch(console.warn);
        });

        unsubscribeEvents.push(unsubscribeCancelEvent);
      });
    });

    return () => {
      unsubscribeMultisigs.forEach((unsubscribeEvent) => unsubscribeEvent());
      Promise.all(unsubscribeEvents).then(() => console.info('unsubscribed from events'));
    };
  }, [connections, accounts.length]);

  return <MultisigChainContext.Provider value={{}}>{children}</MultisigChainContext.Provider>;
};

export const useMultisigChainContext = () => useContext<MultisigChainContextProps>(MultisigChainContext);
