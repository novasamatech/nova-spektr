import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState, ComponentProps } from 'react';

import { useI18n } from '@renderer/context/I18nContext';
import {
  MultisigEvent,
  MultisigTxFinalStatus,
  SigningStatus,
  Transaction,
  TransactionType,
  MultisigTransaction,
} from '@renderer/domain/transaction';
import { HexString } from '@renderer/domain/shared-kernel';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { useMatrix } from '@renderer/context/MatrixContext';
import { Account } from '@renderer/domain/account';
import { ExtrinsicResultParams } from '@renderer/services/transaction/common/types';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { toAccountId } from '@renderer/shared/utils/address';
import { useToggle } from '@renderer/shared/hooks';
import { Button } from '@renderer/components/ui-redesign';
import { OperationResult } from '@renderer/components/common/OperationResult/OperationResult';
import { useMultisigEvent } from '@renderer/services/multisigEvent/multisigEventService';
import { useMultisigChainContext } from '@renderer/context/MultisigChainContext';

type ResultProps = Pick<ComponentProps<typeof OperationResult>, 'title' | 'description' | 'variant'>;

type Props = {
  api: ApiPromise;
  account?: Account;
  tx: Transaction;
  multisigTx?: MultisigTransaction;
  matrixRoomId: string;
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
  matrixRoomId,
  unsignedTx,
  signature,
  rejectReason,
  isReject,
  onClose,
}: Props) => {
  const { t } = useI18n();

  const { matrix } = useMatrix();
  const { submitAndWatchExtrinsic, getSignedExtrinsic } = useTransaction();
  const { addEventTask } = useMultisigChainContext();
  const { updateMultisigTx } = useMultisigTx({ addEventTask });
  const { addEvent } = useMultisigEvent();

  const [inProgress, toggleInProgress] = useToggle(true);
  const [successMessage, toggleSuccessMessage] = useToggle();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    submitExtrinsic(signature).catch(() => console.warn('Error getting signed extrinsics'));
  }, []);

  const submitExtrinsic = async (signature: HexString) => {
    const extrinsic = await getSignedExtrinsic(unsignedTx, signature, api);

    submitAndWatchExtrinsic(extrinsic, unsignedTx, api, async (executed, params) => {
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
          }

          if (matrix.userIsLoggedIn) {
            sendMultisigEvent(updatedTx, typedParams, rejectReason);
          } else {
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

            await addEvent(event);
          }
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

  const sendMultisigEvent = (updatedTx: MultisigTransaction, params: ExtrinsicResultParams, rejectReason?: string) => {
    if (!tx || !updatedTx) return;

    const payload = {
      senderAccountId: toAccountId(tx.address),
      chainId: updatedTx.chainId,
      callHash: updatedTx.callHash,
      extrinsicTimepoint: params.timepoint,
      extrinsicHash: params.extrinsicHash,
      error: Boolean(params.multisigError),
      description: rejectReason,
      callTimepoint: {
        height: updatedTx.blockCreated || params.timepoint.height,
        index: updatedTx.indexCreated || params.timepoint.index,
      },
    };

    if (tx.type === TransactionType.MULTISIG_CANCEL_AS_MULTI) {
      matrix.sendCancel(matrixRoomId, payload).catch(console.warn);
    } else if (params.isFinalApprove) {
      matrix.sendFinalApprove(matrixRoomId, { ...payload, callOutcome: updatedTx.status }).catch(console.warn);
    } else {
      matrix.sendApprove(matrixRoomId, payload).catch(console.warn);
    }
  };

  const getResultProps = (): ResultProps => {
    if (inProgress) {
      return { title: t(isReject ? 'operation.rejectInProgress' : 'operation.inProgress'), variant: 'loading' };
    }
    if (successMessage) {
      return { title: t(isReject ? 'operation.successRejectMessage' : 'operation.successMessage'), variant: 'success' };
    }
    if (errorMessage) {
      return { title: t('operation.feeErrorTitle'), description: errorMessage, variant: 'error' };
    }

    return { title: '' };
  };

  const closeErrorMessage = () => {
    onClose();
    setErrorMessage('');
  };

  return (
    <OperationResult
      isOpen={Boolean(inProgress || errorMessage || successMessage)}
      {...getResultProps()}
      onClose={onClose}
    >
      {errorMessage && <Button onClick={closeErrorMessage}>{t('operation.feeErrorButton')}</Button>}
    </OperationResult>
  );
};
