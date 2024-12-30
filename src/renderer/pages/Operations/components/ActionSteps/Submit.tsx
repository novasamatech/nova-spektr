import { type ApiPromise } from '@polkadot/api';
import { type ComponentProps, useEffect, useState } from 'react';

import { useMultisigChainContext } from '@/app/providers';
import {
  type Account,
  type HexString,
  type MultisigEvent,
  type MultisigTransaction,
  type SigningStatus,
  type Transaction,
} from '@/shared/core';
import { MultisigTxFinalStatus, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button, StatusModal } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { useMultisigEvent, useMultisigTx } from '@/entities/multisig';
import { type ExtrinsicResultParams, isProxyTypeTransaction, transactionService } from '@/entities/transaction';
import { proxiesModel } from '@/features/proxies';

type ResultProps = Pick<ComponentProps<typeof StatusModal>, 'title' | 'content' | 'description'>;

type Props = {
  api: ApiPromise;
  account?: Account;
  tx: Transaction;
  multisigTx?: MultisigTransaction;
  txPayload: Uint8Array;
  signature: HexString;
  isReject?: boolean;
  onClose: () => void;
};

export const Submit = ({ api, tx, multisigTx, account, txPayload, signature, isReject, onClose }: Props) => {
  const { t } = useI18n();

  const { addTask } = useMultisigChainContext();
  const { updateMultisigTx } = useMultisigTx({ addTask });
  const { addEventWithQueue } = useMultisigEvent({ addTask });

  const [inProgress, toggleInProgress] = useToggle(true);
  const [successMessage, toggleSuccessMessage] = useToggle();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    submitExtrinsic(signature).catch(() => console.warn('Error getting signed extrinsics'));
  }, []);

  const submitExtrinsic = async (signature: HexString) => {
    transactionService.signAndSubmit(tx, signature, txPayload, api, async (executed, params) => {
      if (executed) {
        const typedParams = params as ExtrinsicResultParams;

        if (multisigTx && tx && account?.accountId) {
          const isReject = tx.type === TransactionType.MULTISIG_CANCEL_AS_MULTI;

          const updatedTx: MultisigTransaction = { ...multisigTx };

          if (typedParams.isFinalApprove) {
            updatedTx.status = typedParams.multisigError ? MultisigTxFinalStatus.ERROR : MultisigTxFinalStatus.EXECUTED;
          }

          if (
            typedParams.isFinalApprove &&
            !typedParams.multisigError &&
            isProxyTypeTransaction(multisigTx.transaction)
          ) {
            proxiesModel.events.workerStarted();
          }

          if (isReject) {
            updatedTx.status = MultisigTxFinalStatus.CANCELLED;
          }

          await updateMultisigTx(updatedTx);

          const eventStatus: SigningStatus = isReject ? 'CANCELLED' : 'SIGNED';
          const event: MultisigEvent = {
            txAccountId: multisigTx.accountId,
            txChainId: multisigTx.chainId,
            txCallHash: multisigTx.callHash,
            txBlock: multisigTx.blockCreated,
            txIndex: multisigTx.indexCreated,
            status: eventStatus,
            accountId: account.accountId,
            extrinsicHash: typedParams.extrinsicHash,
            eventBlock: typedParams.timepoint.height,
            eventIndex: typedParams.timepoint.index,
            dateCreated: Date.now(),
          };

          await addEventWithQueue(event);
        }

        toggleSuccessMessage();
        setTimeout(() => {
          toggleSuccessMessage();
          onClose();
        }, 2000);
      } else {
        setErrorMessage(params as string);
      }
      toggleInProgress();
    });
  };

  const getResultProps = (): ResultProps => {
    if (inProgress) {
      return {
        title: t(isReject ? 'operation.rejectInProgress' : 'operation.inProgress'),
        content: <Animation variant="loading" loop />,
      };
    }
    if (successMessage) {
      return {
        title: t(isReject ? 'operation.successRejectMessage' : 'operation.successMessage'),
        content: <Animation variant="success" />,
      };
    }
    if (errorMessage) {
      return {
        title: t('operation.feeErrorTitle'),
        content: <Animation variant="error" />,
        description: errorMessage,
      };
    }

    return { title: '' };
  };

  const closeErrorMessage = () => {
    onClose();
    setErrorMessage('');
  };

  return (
    <StatusModal isOpen={Boolean(inProgress || errorMessage || successMessage)} {...getResultProps()} onClose={onClose}>
      {errorMessage && <Button onClick={closeErrorMessage}>{t('operation.submitErrorButton')}</Button>}
    </StatusModal>
  );
};
