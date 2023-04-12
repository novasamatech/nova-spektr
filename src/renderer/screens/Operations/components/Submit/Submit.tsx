import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState } from 'react';

import { Icon, Plate } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { MultisigEvent, MultisigTxFinalStatus, Transaction } from '@renderer/domain/transaction';
import { HexString } from '@renderer/domain/shared-kernel';
import { useToggle } from '@renderer/shared/hooks';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { useMatrix } from '@renderer/context/MatrixContext';
import { Account, MultisigAccount } from '@renderer/domain/account';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { MultisigTransactionDS } from '@renderer/services/storage';
import { ExtrinsicResultParams } from '@renderer/services/transaction/common/types';

type Props = {
  api: ApiPromise;
  account?: Account;
  tx: Transaction;
  multisigTx?: MultisigTransactionDS;
  multisigAccount?: MultisigAccount;
  unsignedTx: UnsignedTransaction;
  signature: HexString;
};

export const Submit = ({ api, tx, multisigTx, account, multisigAccount, unsignedTx, signature }: Props) => {
  const { t } = useI18n();

  const { matrix } = useMatrix();
  const { submitAndWatchExtrinsic, getSignedExtrinsic } = useTransaction();
  const { updateMultisigTx } = useMultisigTx();

  const [inProgress, toggleInProgress] = useToggle(true);
  const [successMessage, toggleSuccessMessage] = useToggle();
  const [errorMessage, setErrorMessage] = useState('');

  const submitExtrinsic = async (signature: HexString) => {
    const extrinsic = await getSignedExtrinsic(unsignedTx, signature, api);

    submitAndWatchExtrinsic(extrinsic, unsignedTx, api, async (executed, params) => {
      if (executed) {
        const typedParams = params as ExtrinsicResultParams;
        if (multisigTx?.transaction && multisigAccount && account) {
          const approveEvent = {
            status: 'SIGNED',
            extrinsicHash: typedParams.extrinsicHash,
            accountId: account.publicKey,
            eventBlock: typedParams.timepoint.height,
            eventIndex: typedParams.timepoint.index,
          } as MultisigEvent;

          const updatedTx = {
            ...multisigTx,
            events: [...multisigTx.events, approveEvent],
          } as MultisigTransactionDS;

          if (typedParams.isFinalApprove) {
            const transactionStatus = typedParams.multisigError
              ? MultisigTxFinalStatus.ERROR
              : MultisigTxFinalStatus.EXECUTED;

            updatedTx.status = transactionStatus;
            approveEvent.multisigOutcome = transactionStatus;
          }

          await updateMultisigTx(updatedTx);

          await sendMstApproval(multisigAccount.matrixRoomId, multisigTx, typedParams);
        }

        toggleSuccessMessage();
      } else {
        setErrorMessage(params as string);
      }
      toggleInProgress();
    });
  };

  const sendMstApproval = async (
    roomId: string,
    multisigTx: MultisigTransactionDS,
    params: ExtrinsicResultParams,
  ): Promise<void> => {
    try {
      const transaction = multisigTx.transaction;
      const action = params.isFinalApprove ? matrix.mstFinalApprove : matrix.mstApprove;

      if (!transaction) return;

      await action(roomId, {
        senderAddress: tx.address,
        chainId: transaction.chainId,
        callHash: transaction.args.callHash,
        extrinsicTimepoint: params.timepoint,
        callTimepoint: {
          height: multisigTx.blockCreated || params.timepoint.height,
          index: multisigTx.indexCreated || params.timepoint.index,
        },
        error: !!params.multisigError,
      });
    } catch (error) {
      console.warn(error);
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
            {t('transfer.successMessage')}
          </div>
        )}

        {errorMessage && (
          <div className="flex uppercase items-center gap-2.5">
            <Icon name="warnCutout" size={20} className="text-error" />
            {errorMessage}
          </div>
        )}
      </Plate>
    </>
  );
};
