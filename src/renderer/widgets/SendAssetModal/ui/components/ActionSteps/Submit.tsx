import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState, ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';

import { useI18n, useMatrix, useMultisigChainContext, Paths } from '@renderer/app/providers';
import {
  Transaction,
  MultisigTransaction,
  useTransaction,
  ExtrinsicResultParams,
  OperationResult,
} from '@renderer/entities/transaction';
import { HexString } from '@renderer/domain/shared-kernel';
import { Account, MultisigAccount, isMultisig } from '@renderer/entities/account';
import { useMultisigTx, useMultisigEvent, buildMultisigTx } from '@renderer/entities/multisig';
import { toAccountId } from '@renderer/shared/lib/utils';
import { useToggle } from '@renderer/shared/lib/hooks';
import { Button } from '@renderer/shared/ui';

type ResultProps = Pick<ComponentProps<typeof OperationResult>, 'title' | 'description' | 'variant'>;

type Props = {
  api: ApiPromise;
  account?: Account | MultisigAccount;
  tx: Transaction;
  multisigTx?: Transaction;
  unsignedTx: UnsignedTransaction;
  signature: HexString;
  description?: string;
  onClose: () => void;
};

export const Submit = ({ api, tx, multisigTx, account, unsignedTx, signature, description, onClose }: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const { matrix } = useMatrix();
  const { addTask } = useMultisigChainContext();

  const { addMultisigTx } = useMultisigTx({ addTask });
  const { submitAndWatchExtrinsic, getSignedExtrinsic } = useTransaction();
  const { addEventWithQueue } = useMultisigEvent({ addTask });

  const [inProgress, toggleInProgress] = useToggle(true);
  const [successMessage, toggleSuccessMessage] = useToggle();
  const [errorMessage, setErrorMessage] = useState('');

  const handleClose = () => {
    onClose();

    if (isMultisig(account) && successMessage) {
      navigate(Paths.OPERATIONS);
    }
  };

  const closeSuccessMessage = () => {
    onClose();
    toggleSuccessMessage();

    if (isMultisig(account)) {
      navigate(Paths.OPERATIONS);
    }
  };

  const closeErrorMessage = () => {
    onClose();
    setErrorMessage('');
  };

  useEffect(() => {
    submitExtrinsic(signature).catch(() => console.warn('Error getting signed extrinsics'));
  }, []);

  const submitExtrinsic = async (signature: HexString) => {
    const extrinsic = await getSignedExtrinsic(unsignedTx, signature, api);

    submitAndWatchExtrinsic(extrinsic, unsignedTx, api, async (executed, params) => {
      if (executed) {
        if (multisigTx && isMultisig(account)) {
          const result = buildMultisigTx(tx, multisigTx, params as ExtrinsicResultParams, account, description);

          await Promise.all([addMultisigTx(result.transaction), addEventWithQueue(result.event)]);

          console.log(`New transfer was created with call hash ${result.transaction.callHash}`);

          if (matrix.userIsLoggedIn) {
            sendMultisigEvent(account.matrixRoomId, result.transaction, params as ExtrinsicResultParams);
          }
        }

        toggleSuccessMessage();
        setTimeout(closeSuccessMessage, 2000);
      } else {
        setErrorMessage(params as string);
      }

      toggleInProgress();
    });
  };

  const sendMultisigEvent = (matrixRoomId: string, updatedTx: MultisigTransaction, params: ExtrinsicResultParams) => {
    if (!multisigTx) return;

    matrix
      .sendApprove(matrixRoomId, {
        senderAccountId: toAccountId(multisigTx.address),
        chainId: updatedTx.chainId,
        callHash: updatedTx.callHash,
        callData: updatedTx.callData,
        extrinsicTimepoint: params.timepoint,
        extrinsicHash: params.extrinsicHash,
        error: Boolean(params.multisigError),
        description,
        callTimepoint: {
          height: updatedTx.blockCreated || params.timepoint.height,
          index: updatedTx.indexCreated || params.timepoint.index,
        },
      })
      .catch(console.warn);
  };

  const getResultProps = (): ResultProps => {
    if (inProgress) {
      return { title: t('transfer.inProgress'), variant: 'loading' };
    }
    if (successMessage) {
      return { title: t('transfer.successMessage'), variant: 'success' };
    }
    if (errorMessage) {
      return { title: t('operation.feeErrorTitle'), description: errorMessage, variant: 'error' };
    }

    return { title: '' };
  };

  return (
    <OperationResult
      isOpen={Boolean(inProgress || errorMessage || successMessage)}
      {...getResultProps()}
      onClose={handleClose}
    >
      {errorMessage && <Button onClick={closeErrorMessage}>{t('operation.feeErrorButton')}</Button>}
    </OperationResult>
  );
};
