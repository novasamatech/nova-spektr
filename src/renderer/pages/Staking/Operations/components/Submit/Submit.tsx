import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState, ComponentProps } from 'react';
import { ApiPromise } from '@polkadot/api';
import { useNavigate } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { useI18n, useMultisigChainContext } from '@app/providers';
import { Paths } from '@shared/routes';
import { HexString } from '@shared/core';
import {
  useTransaction,
  ExtrinsicResultParams,
  OperationResult,
  Transaction,
  MultisigEvent,
  MultisigTransaction,
  MultisigTxInitStatus,
} from '@entities/transaction';
import { toAccountId, DEFAULT_TRANSITION } from '@shared/lib/utils';
import { Button } from '@shared/ui';
import { useToggle } from '@shared/lib/hooks';
import { useMultisigTx, useMultisigEvent } from '@entities/multisig';
import type { Account, MultisigAccount } from '@shared/core';
import { accountUtils } from '@entities/wallet';
import { matrixModel } from '@entities/matrix';

type ResultProps = Pick<ComponentProps<typeof OperationResult>, 'title' | 'description' | 'variant'>;

// TODO: Looks very similar to ActionSteps/Submit.tsx

type Props = {
  api: ApiPromise;
  accounts: Array<Account | MultisigAccount>;
  txs: Transaction[];
  multisigTx?: Transaction;
  unsignedTx: UnsignedTransaction[];
  signatures: HexString[];
  description?: string;
  onClose: () => void;
};

export const Submit = ({ api, accounts, txs, multisigTx, unsignedTx, signatures, description, onClose }: Props) => {
  const { t } = useI18n();

  const matrix = useUnit(matrixModel.$matrix);

  const navigate = useNavigate();
  const { submitAndWatchExtrinsic, getSignedExtrinsic } = useTransaction();
  const { addTask } = useMultisigChainContext();

  const { addMultisigTx } = useMultisigTx({ addTask });
  const { addEventWithQueue } = useMultisigEvent({ addTask });

  const [isSuccess, toggleSuccessMessage] = useToggle();
  const [inProgress, toggleInProgress] = useToggle(true);
  const [errorMessage, setErrorMessage] = useState('');

  const firstAccount = accounts[0];
  const isMultisigAccount = accountUtils.isMultisigAccount(firstAccount);

  useEffect(() => {
    submitExtrinsic(signatures).catch(() => console.warn('Error getting signed extrinsics'));
  }, []);

  const handleSuccessClose = () => {
    if (isMultisigAccount && isSuccess) {
      setTimeout(() => navigate(Paths.OPERATIONS), DEFAULT_TRANSITION);
    } else {
      setTimeout(() => navigate(Paths.STAKING), DEFAULT_TRANSITION);
    }

    onClose();
  };

  const submitExtrinsic = async (signatures: HexString[]): Promise<void> => {
    const extrinsicRequests = unsignedTx.map((unsigned, index) => {
      return getSignedExtrinsic(unsigned, signatures[index], api);
    });

    const allExtrinsics = await Promise.all(extrinsicRequests);

    allExtrinsics.forEach((extrinsic, index) => {
      submitAndWatchExtrinsic(extrinsic, unsignedTx[index], api, async (executed, params) => {
        if (executed) {
          const typedParams = params as ExtrinsicResultParams;

          if (multisigTx && isMultisigAccount) {
            const newTx: MultisigTransaction = {
              accountId: firstAccount.accountId,
              chainId: multisigTx.chainId,
              signatories: firstAccount.signatories,
              callData: multisigTx.args.callData,
              callHash: multisigTx.args.callHash,
              transaction: txs[index],
              status: MultisigTxInitStatus.SIGNING,
              blockCreated: typedParams.timepoint.height,
              indexCreated: typedParams.timepoint.index,
              dateCreated: Date.now(),
              description,
            };

            const event: MultisigEvent = {
              txAccountId: newTx.accountId,
              txChainId: newTx.chainId,
              txCallHash: newTx.callHash,
              txBlock: newTx.blockCreated,
              txIndex: newTx.indexCreated,
              status: 'SIGNED',
              accountId: toAccountId(multisigTx.address),
              extrinsicHash: typedParams.extrinsicHash,
              eventBlock: typedParams.timepoint.height,
              eventIndex: typedParams.timepoint.index,
              dateCreated: Date.now(),
            };

            await Promise.all([addMultisigTx(newTx), addEventWithQueue(event)]);

            if (matrix.userIsLoggedIn && firstAccount.matrixRoomId) {
              sendMultisigEvent(firstAccount.matrixRoomId, newTx, typedParams);
            }
          }

          toggleSuccessMessage();
          setTimeout(() => {
            onClose();

            if (isMultisigAccount) {
              setTimeout(() => navigate(Paths.OPERATIONS), DEFAULT_TRANSITION);
            } else {
              setTimeout(() => navigate(Paths.STAKING), DEFAULT_TRANSITION);
            }
          }, 2000);
        } else {
          setErrorMessage(params as string);
        }

        toggleInProgress();
      });
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

  const getSuccessMessage = (): string => {
    if (multisigTx) return t('staking.submitSuccessMultisig');
    if (accounts.length === 1) return t('staking.submitSuccessSingle');

    return t('staking.submitSuccessMultishard');
  };

  const closeErrorMessage = () => {
    onClose();
    setErrorMessage('');
  };

  const getResultProps = (): ResultProps => {
    if (inProgress) {
      return { title: t('operation.inProgress'), variant: 'loading' };
    }
    if (isSuccess) {
      return { title: getSuccessMessage(), variant: 'success' };
    }
    if (errorMessage) {
      return { title: t('operation.feeErrorTitle'), description: errorMessage, variant: 'error' };
    }

    return { title: '' };
  };

  return (
    <OperationResult
      isOpen={Boolean(inProgress || errorMessage || isSuccess)}
      {...getResultProps()}
      onClose={handleSuccessClose}
    >
      {errorMessage && <Button onClick={closeErrorMessage}>{t('operation.submitErrorButton')}</Button>}
    </OperationResult>
  );
};
