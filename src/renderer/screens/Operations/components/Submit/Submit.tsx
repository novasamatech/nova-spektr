import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState } from 'react';

import { Icon, Plate } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Transaction } from '@renderer/domain/transaction';
import { HexString } from '@renderer/domain/shared-kernel';
import { useToggle } from '@renderer/shared/hooks';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { useMatrix } from '@renderer/context/MatrixContext';
import { Account, MultisigAccount } from '@renderer/domain/account';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { MultisigTransactionDS } from '@renderer/services/storage';

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
        if (multisigTx?.transaction && multisigAccount && account) {
          await updateMultisigTx({
            ...multisigTx,
            events: [
              ...multisigTx.events,
              {
                status: 'SIGNED',
                extrinsicHash: params.extrinsicHash,
                accountId: account.publicKey,
                eventBlock: params.timepoint.height,
                eventIndex: params.timepoint.index,
              },
            ],
          } as MultisigTransactionDS);

          await sendMstApproval(multisigAccount.matrixRoomId, multisigTx, params);
        }

        toggleSuccessMessage();
      } else {
        setErrorMessage(params as string);
      }
      toggleInProgress();
    });
  };

  const sendMstApproval = async (roomId: string, multisigTx: MultisigTransactionDS, params: any): Promise<void> => {
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
        error: false,
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
