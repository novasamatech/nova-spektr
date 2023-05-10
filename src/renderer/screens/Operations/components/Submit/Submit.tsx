import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState } from 'react';

import { Icon, Plate } from '@renderer/components/ui';
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
import { useToggle } from '@renderer/shared/hooks';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { useMatrix } from '@renderer/context/MatrixContext';
import { Account } from '@renderer/domain/account';
import { ExtrinsicResultParams } from '@renderer/services/transaction/common/types';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { toAccountId } from '@renderer/shared/utils/address';

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

  useEffect(() => {
    submitExtrinsic(signature);
  }, []);

  return (
    <>
      <Plate as="section" className="w-[500px] flex flex-col items-center mx-auto gap-y-5">
        {inProgress && (
          <div className="flex items-center gap-x-2.5 mx-auto">
            <Icon className="text-neutral-variant animate-spin" name="loader" size={20} />
            <p className="text-neutral-variant font-semibold">{t('transfer.executing')}</p>
          </div>
        )}

        {successMessage && (
          <div className="flex uppercase items-center gap-2.5">
            <Icon name="checkmarkCutout" size={20} className="text-success" />
            <p className="flex-1">{t('transfer.successMessage')}</p>
          </div>
        )}

        {errorMessage && (
          <div className="flex uppercase items-center gap-2.5">
            <Icon name="warnCutout" size={20} className="text-error" />
            <p className="flex-1">{errorMessage}</p>
          </div>
        )}
      </Plate>
    </>
  );
};
