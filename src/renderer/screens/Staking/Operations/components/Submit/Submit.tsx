import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState, ComponentProps } from 'react';
import { ApiPromise } from '@polkadot/api';

import { useI18n } from '@renderer/context/I18nContext';
import { HexString } from '@renderer/domain/shared-kernel';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { ExtrinsicResultParams } from '@renderer/services/transaction/common/types';
import { isMultisig, Account, MultisigAccount } from '@renderer/domain/account';
import {
  Transaction,
  SigningStatus,
  MultisigEvent,
  MultisigTransaction,
  MultisigTxInitStatus,
} from '@renderer/domain/transaction';
import { toAccountId } from '@renderer/shared/utils/address';
import { useMatrix } from '@renderer/context/MatrixContext';
import { Button } from '@renderer/components/ui-redesign';
import OperationResult from '@renderer/components/ui-redesign/OperationResult/OperationResult';
import { useToggle } from '@renderer/shared/hooks';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';

type ResultProps = Pick<ComponentProps<typeof OperationResult>, 'title' | 'description' | 'variant'>;

// TODO: Looks very similar to ActionSteps/Submit.tsx

type Props = {
  api: ApiPromise;
  accounts: Array<Account | MultisigAccount>;
  txs: Transaction[];
  multisigTx?: Transaction;
  unsignedTx: UnsignedTransaction[];
  signatures: HexString[];
  successMessage: string;
  description?: string;
  onClose: () => void;
};

export const Submit = ({
  api,
  accounts,
  txs,
  multisigTx,
  unsignedTx,
  signatures,
  successMessage,
  description,
  onClose,
}: Props) => {
  const { t } = useI18n();

  const { matrix } = useMatrix();
  const { submitAndWatchExtrinsic, getSignedExtrinsic } = useTransaction();
  const { addMultisigTx } = useMultisigTx();

  const [isSuccess, toggleSuccessMessage] = useToggle();
  const [inProgress, toggleInProgress] = useToggle(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    submitExtrinsic(signatures).catch(() => console.warn('Error getting signed extrinsics'));
  }, []);

  const submitExtrinsic = async (signatures: HexString[]): Promise<void> => {
    const extrinsicRequests = unsignedTx.map((unsigned, index) => {
      return getSignedExtrinsic(unsigned, signatures[index], api);
    });

    const allExtrinsics = await Promise.all(extrinsicRequests);

    allExtrinsics.forEach((extrinsic, index) => {
      submitAndWatchExtrinsic(extrinsic, unsignedTx[index], api, (executed, params) => {
        if (executed) {
          const typedParams = params as ExtrinsicResultParams;

          const mstAccount = accounts[0];
          if (multisigTx && isMultisig(mstAccount) && matrix.userIsLoggedIn) {
            const eventStatus: SigningStatus = 'SIGNED';

            const event: MultisigEvent = {
              status: eventStatus,
              accountId: mstAccount.accountId,
              extrinsicHash: typedParams.extrinsicHash,
              eventBlock: typedParams.timepoint.height,
              eventIndex: typedParams.timepoint.index,
            };

            const newTx: MultisigTransaction = {
              accountId: mstAccount.accountId,
              chainId: multisigTx.chainId,
              signatories: mstAccount.signatories,
              callData: multisigTx.args.callData,
              callHash: multisigTx.args.callHash,
              transaction: txs[index],
              status: MultisigTxInitStatus.SIGNING,
              blockCreated: typedParams.timepoint.height,
              indexCreated: typedParams.timepoint.index,
              events: [event],
            };

            if (matrix.userIsLoggedIn) {
              sendMultisigEvent(mstAccount.matrixRoomId, newTx, typedParams);
            } else {
              addMultisigTx(newTx);
            }
          }

          toggleSuccessMessage();
          setTimeout(onClose, 2000);
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

  const getResultProps = (): ResultProps => {
    if (inProgress) {
      return { title: t('operation.inProgress'), variant: 'loading' };
    }
    if (isSuccess) {
      return { title: successMessage, variant: 'success' };
    }
    if (errorMessage) {
      return { title: t('operation.feeErrorTitle'), description: errorMessage, variant: 'error' };
    }

    return { title: '' };
  };

  return (
    <OperationResult isOpen={Boolean(inProgress || errorMessage || isSuccess)} {...getResultProps()} onClose={onClose}>
      {errorMessage && <Button onClick={onClose}>{t('operation.feeErrorButton')}</Button>}
    </OperationResult>
  );
};
