import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import React, { useEffect, useState } from 'react';

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
import OperationResult from '@renderer/components/ui-redesign/OperationResult/OperationResult';

type ResultProps = Pick<React.ComponentProps<typeof OperationResult>, 'title' | 'description' | 'variant'>;

type Props = {
  api: ApiPromise;
  account?: Account;
  tx: Transaction;
  multisigTx?: MultisigTransaction;
  matrixRoomId: string;
  unsignedTx: UnsignedTransaction;
  signature: HexString;
  rejectReason?: string;
};

export const Submit = ({ api, tx, multisigTx, account, matrixRoomId, unsignedTx, signature, rejectReason }: Props) => {
  const { t } = useI18n();

  const { matrix } = useMatrix();
  const { submitAndWatchExtrinsic, getSignedExtrinsic } = useTransaction();
  const { updateMultisigTx } = useMultisigTx();

  const [inProgress, toggleInProgress] = useToggle(true);
  const [successMessage, toggleSuccessMessage] = useToggle();
  const [errorMessage, setErrorMessage] = useState('');

  const submitExtrinsic = async (signature: HexString) => {
    const extrinsic = await getSignedExtrinsic(unsignedTx, signature, api);

    submitAndWatchExtrinsic(extrinsic, unsignedTx, api, (executed, params) => {
      if (executed) {
        const typedParams = params as ExtrinsicResultParams;
        if (multisigTx && tx && account?.accountId) {
          const isReject = tx.type === TransactionType.MULTISIG_CANCEL_AS_MULTI;
          const eventStatus: SigningStatus = isReject ? 'CANCELLED' : 'SIGNED';

          const event: MultisigEvent = {
            status: eventStatus,
            accountId: account.accountId,
            extrinsicHash: typedParams.extrinsicHash,
            eventBlock: typedParams.timepoint.height,
            eventIndex: typedParams.timepoint.index,
          };

          const updatedTx: MultisigTransaction = { ...multisigTx, events: multisigTx.events.concat(event) };

          if (typedParams.isFinalApprove) {
            const transactionStatus = typedParams.multisigError
              ? MultisigTxFinalStatus.ERROR
              : MultisigTxFinalStatus.EXECUTED;

            updatedTx.status = transactionStatus;
            event.multisigOutcome = transactionStatus;
          }

          if (isReject) {
            updatedTx.status = MultisigTxFinalStatus.CANCELLED;
            event.multisigOutcome = MultisigTxFinalStatus.CANCELLED;
          }

          if (matrix.userIsLoggedIn) {
            sendMultisigEvent(updatedTx, typedParams, rejectReason);
          } else {
            updateMultisigTx(updatedTx);
          }
        }

        toggleSuccessMessage();
        setTimeout(toggleSuccessMessage, 2000);
      } else {
        setErrorMessage(params as string);
      }
      toggleInProgress();
    });
  };

  const sendMultisigEvent = (updatedTx: MultisigTransaction, params: ExtrinsicResultParams, rejectReason?: string) => {
    if (!tx || !updatedTx.transaction) return;

    const transaction = updatedTx.transaction;
    const payload = {
      senderAccountId: toAccountId(tx.address),
      chainId: transaction.chainId,
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
      return { title: t('operation.inProgress'), variant: 'loading' };
    }
    if (successMessage) {
      return { title: t('operation.successMessage'), variant: 'success' };
    }
    if (errorMessage) {
      return { title: t('operation.feeErrorTitle'), description: errorMessage, variant: 'error' };
    }

    return { title: '' };
  };

  useEffect(() => {
    submitExtrinsic(signature);
  }, []);

  return (
    <>
      <OperationResult
        isOpen={Boolean(inProgress || errorMessage || successMessage)}
        {...getResultProps()}
        onClose={() => {}}
      >
        {errorMessage && <Button onClick={() => setErrorMessage('')}>{t('operation.feeErrorButton')}</Button>}
      </OperationResult>
    </>
  );
};
