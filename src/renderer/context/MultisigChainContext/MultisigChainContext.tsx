import { createContext, PropsWithChildren, useContext, useEffect } from 'react';
import { ApiPromise } from '@polkadot/api';
import { UnsubscribePromise } from '@polkadot/api/types';
import { Event } from '@polkadot/types/interfaces';

import { useChainSubscription } from '@renderer/services/chainSubscription/chainSubscriptionService';
import { useNetworkContext } from '../NetworkContext';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { useAccount } from '@renderer/services/account/accountService';
import { MultisigAccount } from '@renderer/domain/account';
import { MiltisigTxFinalStatus, SigningStatus } from '@renderer/domain/transaction';
import { Signatory } from '@renderer/domain/signatory';

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
    resultTransactionStatus: MiltisigTxFinalStatus,
  ) => {
    const txs = await getMultisigTxs({
      publicKey: account.publicKey,
      callHash: event.data[3].toHex(),
    });

    const lastTx = txs[txs.length - 1];

    if (!lastTx) return;

    const signatory = lastTx.signatories.find(
      (signatory) => signatory.publicKey === event.data[0].toHex(),
    ) as Signatory;

    const newEvents = lastTx.events;
    const pendingEvent = newEvents.findIndex(
      (event) => pendingEventStatuses.includes(event.status) && event.signatory.publicKey === signatory.publicKey,
    );

    if (~pendingEvent) {
      newEvents[pendingEvent].status = resultEventStatus;
    } else {
      newEvents.push({
        status: resultEventStatus,
        signatory,
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

    Object.values(connections).forEach((connection) => {
      if (!connection.api || !connection.api.query.multisig) return;

      accounts.forEach((account) => {
        const unsubscribeMultisig = subscribeMultisigAccount(connection.api as ApiPromise, account as MultisigAccount);
        unsubscribeMultisigs.push(unsubscribeMultisig);

        const successParams = {
          section: 'multisig',
          method: 'MultisigExecuted',
          data: [undefined, undefined, account.accountId],
        };

        const unsubscribeSuccessEvent = subscribeEvents(connection.api as ApiPromise, successParams, (event: Event) => {
          (async () => {
            await eventCallback(
              account as MultisigAccount,
              event,
              ['PENDING_SIGNED', 'SIGNED'],
              'SIGNED',
              MiltisigTxFinalStatus.SUCCESS,
            );
          })();
        });
        unsubscribeEvents.push(unsubscribeSuccessEvent);

        const cancelParams = {
          section: 'multisig',
          method: 'MultisigCancelled',
          data: [undefined, undefined, account.accountId],
        };
        const unsubscribeCancelEvent = subscribeEvents(connection.api as ApiPromise, cancelParams, (event: Event) => {
          (async () => {
            await eventCallback(
              account as MultisigAccount,
              event,
              ['PENDING_CANCELLED', 'CANCELLED'],
              'CANCELLED',
              MiltisigTxFinalStatus.CANCELLED,
            );
          })();
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
