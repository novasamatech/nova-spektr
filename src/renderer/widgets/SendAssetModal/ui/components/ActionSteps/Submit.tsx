import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState, ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { useI18n, useMultisigChainContext } from '@app/providers';
import { Paths } from '@shared/routes';
import {
  Transaction,
  MultisigTransaction,
  useTransaction,
  ExtrinsicResultParams,
  OperationResult,
} from '@entities/transaction';
import { HexString } from '@shared/core';
import { useMultisigTx, useMultisigEvent, buildMultisigTx } from '@entities/multisig';
import { toAccountId } from '@shared/lib/utils';
import { useToggle } from '@shared/lib/hooks';
import { Button } from '@shared/ui';
import type { Account, MultisigAccount } from '@shared/core';
import { accountUtils } from '@entities/wallet';
import { matrixModel } from '@entities/matrix';

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

  const matrix = useUnit(matrixModel.$matrix);

  const navigate = useNavigate();
  const { addTask } = useMultisigChainContext();
  const { addMultisigTx } = useMultisigTx({ addTask });
  const { submitAndWatchExtrinsic, getSignedExtrinsic } = useTransaction();
  const { addEventWithQueue } = useMultisigEvent({ addTask });

  const [inProgress, toggleInProgress] = useToggle(true);
  const [successMessage, toggleSuccessMessage] = useToggle();
  const [errorMessage, setErrorMessage] = useState('');

  const isMultisigAccount = account && accountUtils.isMultisigAccount(account);

  const handleClose = () => {
    onClose();

    if (isMultisigAccount && successMessage) {
      navigate(Paths.OPERATIONS);
    } else {
      // TODO: rework to context-free solution

      navigate(Paths.ASSETS);
    }
  };

  const closeSuccessMessage = () => {
    onClose();
    toggleSuccessMessage();

    if (isMultisigAccount) {
      navigate(Paths.OPERATIONS);
    } else {
      // TODO: rework to context-free solution

      navigate(Paths.ASSETS);
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
        if (multisigTx && isMultisigAccount) {
          const result = buildMultisigTx(tx, multisigTx, params as ExtrinsicResultParams, account, description);

          await Promise.all([addMultisigTx(result.transaction), addEventWithQueue(result.event)]);

          console.log(`New transfer was created with call hash ${result.transaction.callHash}`);

          if (matrix.userIsLoggedIn && account.matrixRoomId) {
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
