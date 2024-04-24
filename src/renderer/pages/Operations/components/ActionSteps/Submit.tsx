import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState, ComponentProps } from 'react';

import { useI18n, useMultisigChainContext } from '@app/providers';
import { useMultisigTx, useMultisigEvent } from '@entities/multisig';
import { useToggle } from '@shared/lib/hooks';
import { Button, StatusModal } from '@shared/ui';
import { Animation } from '@shared/ui/Animation/Animation';
import type { Account, HexString } from '@shared/core';
import {
  MultisigEvent,
  MultisigTxFinalStatus,
  SigningStatus,
  Transaction,
  TransactionType,
  MultisigTransaction,
  ExtrinsicResultParams,
  transactionService,
} from '@entities/transaction';

type ResultProps = Pick<ComponentProps<typeof StatusModal>, 'title' | 'content' | 'description'>;

type Props = {
  api: ApiPromise;
  account?: Account;
  tx: Transaction;
  multisigTx?: MultisigTransaction;
  unsignedTx: UnsignedTransaction;
  signature: HexString;
  rejectReason?: string;
  isReject?: boolean;
  onClose: () => void;
};

export const Submit = ({
  api,
  tx,
  multisigTx,
  account,
  unsignedTx,
  signature,
  rejectReason,
  isReject,
  onClose,
}: Props) => {
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
    const extrinsic = await transactionService.getSignedExtrinsic(unsignedTx, signature, api);

    transactionService.submitAndWatchExtrinsic(extrinsic, unsignedTx, api, async (executed, params) => {
      if (executed) {
        const typedParams = params as ExtrinsicResultParams;

        if (multisigTx && tx && account?.accountId) {
          const isReject = tx.type === TransactionType.MULTISIG_CANCEL_AS_MULTI;

          const updatedTx: MultisigTransaction = { ...multisigTx };

          if (typedParams.isFinalApprove) {
            updatedTx.status = typedParams.multisigError ? MultisigTxFinalStatus.ERROR : MultisigTxFinalStatus.EXECUTED;
          }

          if (isReject) {
            updatedTx.status = MultisigTxFinalStatus.CANCELLED;
            updatedTx.cancelDescription = rejectReason;
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

  // const sendMultisigEvent = (updatedTx: MultisigTransaction, params: ExtrinsicResultParams, rejectReason?: string) => {
  //   if (!tx || !updatedTx || !matrixRoomId) return;

  //   const payload = {
  //     senderAccountId: toAccountId(tx.address),
  //     chainId: updatedTx.chainId,
  //     callHash: updatedTx.callHash,
  //     extrinsicTimepoint: params.timepoint,
  //     extrinsicHash: params.extrinsicHash,
  //     error: Boolean(params.multisigError),
  //     description: rejectReason,
  //     callTimepoint: {
  //       height: updatedTx.blockCreated || params.timepoint.height,
  //       index: updatedTx.indexCreated || params.timepoint.index,
  //     },
  //   };

  //   if (tx.type === TransactionType.MULTISIG_CANCEL_AS_MULTI) {
  //     matrix.sendCancel(matrixRoomId, payload).catch(console.warn);
  //   } else if (params.isFinalApprove) {
  //     matrix.sendFinalApprove(matrixRoomId, { ...payload, callOutcome: updatedTx.status }).catch(console.warn);
  //   } else {
  //     matrix.sendApprove(matrixRoomId, payload).catch(console.warn);
  //   }
  // };

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
