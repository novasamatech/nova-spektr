import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState, ComponentProps } from 'react';
import { ApiPromise } from '@polkadot/api';

import { useI18n } from '@renderer/context/I18nContext';
import { HexString } from '@renderer/domain/shared-kernel';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { ExtrinsicResultParams } from '@renderer/services/transaction/common/types';
import { isMultisig, Account, MultisigAccount } from '@renderer/domain/account';
import { Transaction } from '@renderer/domain/transaction';
import { toAccountId } from '@renderer/shared/utils/address';
import { useMatrix } from '@renderer/context/MatrixContext';
import { Button } from '@renderer/components/ui-redesign';
import OperationResult from '@renderer/components/ui-redesign/OperationResult/OperationResult';
import { useToggle } from '@renderer/shared/hooks';

type ResultProps = Pick<ComponentProps<typeof OperationResult>, 'title' | 'description' | 'variant'>;

type Props = {
  api: ApiPromise;
  accounts: Array<Account | MultisigAccount>;
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
  // const { addMultisigTx } = useMultisigTx();

  const [isSuccess, toggleSuccessMessage] = useToggle();
  const [inProgress, toggleInProgress] = useToggle(true);
  const [errorMessage, setErrorMessage] = useState('');

  const closeSuccessMessage = () => {
    toggleSuccessMessage();
    onClose();
  };

  const closeErrorMessage = () => {
    onClose();
    setErrorMessage('');
  };

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
          const mstAccount = accounts[0];

          if (multisigTx && isMultisig(mstAccount) && matrix.userIsLoggedIn) {
            sendMultisigEvent(mstAccount.matrixRoomId, multisigTx, params as ExtrinsicResultParams);
          }

          toggleSuccessMessage();
          setTimeout(closeSuccessMessage, 2000);
        } else {
          setErrorMessage(params as string);
        }

        toggleInProgress();
      });
    });
  };

  const sendMultisigEvent = (roomId: string, transaction: Transaction, params: ExtrinsicResultParams) => {
    matrix
      .sendApprove(roomId, {
        senderAccountId: toAccountId(transaction.address),
        chainId: transaction.chainId,
        callHash: transaction.args.callHash,
        callData: transaction.args.callData,
        extrinsicHash: params.extrinsicHash,
        extrinsicTimepoint: params.timepoint,
        callTimepoint: params.timepoint,
        error: Boolean(params.multisigError),
        description,
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
      {errorMessage && <Button onClick={closeErrorMessage}>{t('operation.feeErrorButton')}</Button>}
    </OperationResult>
  );
};
