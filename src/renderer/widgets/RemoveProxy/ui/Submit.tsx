import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { ComponentProps, useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { useI18n, useMultisigChainContext } from '@app/providers';
import type { Account, MultisigAccount } from '@shared/core';
import { HexString } from '@shared/core';
import { buildMultisigTx, useMultisigEvent, useMultisigTx } from '@entities/multisig';
import { toAccountId } from '@shared/lib/utils';
import { useToggle } from '@shared/lib/hooks';
import { Button } from '@shared/ui';
import { accountUtils } from '@entities/wallet';
import { matrixModel } from '@entities/matrix';
import {
  ExtrinsicResultParams,
  MultisigTransaction,
  OperationResult,
  Transaction,
  transactionService,
} from '@entities/transaction';

type ResultProps = Pick<ComponentProps<typeof OperationResult>, 'title' | 'description' | 'variant'>;

type Props = {
  api: ApiPromise;
  account?: Account | MultisigAccount | null;
  tx: Transaction;
  multisigTx?: Transaction;
  unsignedTx: UnsignedTransaction | null;
  signature: HexString | null;
  onClose: () => void;
  onSubmitted: () => void;
};

export const Submit = ({ api, tx, multisigTx, account, unsignedTx, signature, onClose, onSubmitted }: Props) => {
  const { t } = useI18n();

  const matrix = useUnit(matrixModel.$matrix);

  const { addTask } = useMultisigChainContext();
  const { addMultisigTx } = useMultisigTx({ addTask });
  const { addEventWithQueue } = useMultisigEvent({ addTask });

  const [inProgress, toggleInProgress] = useToggle(true);
  const [successMessage, toggleSuccessMessage] = useToggle();
  const [errorMessage, setErrorMessage] = useState('');

  const isMultisigAccount = account && accountUtils.isMultisigAccount(account);

  const handleClose = () => {
    onClose();
  };

  const closeSuccessMessage = () => {
    onClose();
    onSubmitted();
    toggleSuccessMessage();
  };

  const closeErrorMessage = () => {
    onClose();
    setErrorMessage('');
  };

  useEffect(() => {
    signature && submitExtrinsic(signature).catch(() => console.warn('Error getting signed extrinsics'));
  }, []);

  const submitExtrinsic = async (signature: HexString) => {
    if (!unsignedTx) return;

    const extrinsic = await transactionService.getSignedExtrinsic(unsignedTx, signature, api);

    transactionService.submitAndWatchExtrinsic(extrinsic, unsignedTx, api, async (executed, params) => {
      if (executed) {
        if (multisigTx && isMultisigAccount) {
          const result = buildMultisigTx(tx, multisigTx, params as ExtrinsicResultParams, account);

          await Promise.all([addMultisigTx(result.transaction), addEventWithQueue(result.event)]);

          console.log(`New removeProxy transaction was created with call hash ${result.transaction.callHash}`);

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
      {errorMessage && <Button onClick={closeErrorMessage}>{t('operation.submitErrorButton')}</Button>}
    </OperationResult>
  );
};
