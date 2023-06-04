import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiPromise } from '@polkadot/api';

import { useConfirmContext } from '@renderer/context/ConfirmContext';
import { useI18n } from '@renderer/context/I18nContext';
import { HexString } from '@renderer/domain/shared-kernel';
import Paths from '@renderer/routes/paths';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { ExtrinsicResultParams } from '@renderer/services/transaction/common/types';
import { isMultisig, Account, MultisigAccount } from '@renderer/domain/account';
import { Transaction } from '@renderer/domain/transaction';
import { toAccountId } from '@renderer/shared/utils/address';
import { useMatrix } from '@renderer/context/MatrixContext';
// import { Button } from '@renderer/components/ui-redesign';
// import OperationResult from '@renderer/components/ui-redesign/OperationResult/OperationResult';

// type ResultProps = Pick<ComponentProps<typeof OperationResult>, 'title' | 'description' | 'variant'>;

type Props = {
  api: ApiPromise;
  accounts: Array<Account | MultisigAccount>;
  multisigTx?: Transaction;
  unsignedTx: UnsignedTransaction[];
  signatures: HexString[];
  description?: string;
  onClose: () => void;
};

export const Submit = ({ api, accounts, multisigTx, unsignedTx, signatures, description, onClose }: Props) => {
  const { t } = useI18n();
  const { matrix } = useMatrix();
  const { confirm } = useConfirmContext();
  const { submitAndWatchExtrinsic, getSignedExtrinsic } = useTransaction();
  const navigate = useNavigate();

  const [progress, setProgress] = useState(0);
  const [failedTxs, setFailedTxs] = useState<number[]>([]);

  const submitFinished = unsignedTx.length === progress;

  const confirmFailedTx = (): Promise<boolean> => {
    return confirm({
      title: t('staking.confirmation.errorModalTitle', { number: failedTxs.length }),
      message: t('staking.confirmation.errorModalSubtitle'),
      cancelText: t('staking.confirmation.errorModalDiscardButton'),
      // TODO: implement Edit flow
      // confirmText: t('staking.confirmation.errorModalEditButton'),
    });
  };

  const submitExtrinsic = async (signatures: HexString[]): Promise<void> => {
    const extrinsicRequests = unsignedTx.map((unsigned, index) => {
      return getSignedExtrinsic(unsigned, signatures[index], api);
    });

    const allExtrinsic = await Promise.all(extrinsicRequests);

    allExtrinsic.forEach((extrinsic, index) => {
      submitAndWatchExtrinsic(extrinsic, unsignedTx[index], api, (executed, params) => {
        setProgress((p) => p + 1);

        if (executed) {
          const mstAccount = accounts[0];

          if (multisigTx && isMultisig(mstAccount) && matrix.userIsLoggedIn) {
            sendMultisigEvent(mstAccount.matrixRoomId, multisigTx, params as ExtrinsicResultParams);
          }
        } else {
          setFailedTxs((f) => f.concat(index));
        }
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

  useEffect(() => {
    submitExtrinsic(signatures);
  }, []);

  useEffect(() => {
    if (!submitFinished || failedTxs.length === 0) return;

    confirmFailedTx().then((proceed) => {
      if (!proceed) {
        navigate(Paths.STAKING, { replace: true });
      }

      // TODO: implement Edit flow
    });
  }, [submitFinished]);

  // const getResultProps = (): ResultProps => {
  //   if (inProgress) {
  //     return { title: t('operation.inProgress'), variant: 'loading' };
  //   }
  //   if (successMessage) {
  //     return { title: t('operation.successMessage'), variant: 'success' };
  //   }
  //   if (errorMessage) {
  //     return { title: t('operation.feeErrorTitle'), description: errorMessage, variant: 'error' };
  //   }
  //
  //   return { title: '' };
  // };

  return (
    //eslint-disable-next-line i18next/no-literal-string
    <div>Submit</div>
    // <OperationResult
    //   isOpen={Boolean(inProgress || errorMessage || successMessage)}
    //   {...getResultProps()}
    //   onClose={onClose}
    // >
    //   {errorMessage && <Button onClick={closeErrorMessage}>{t('operation.feeErrorButton')}</Button>}
    // </OperationResult>
  );
};
