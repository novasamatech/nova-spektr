import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';
import { type ComponentProps, useEffect, useState } from 'react';

import { type Account, type HexString, type Transaction } from '@/shared/core';
import { TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { Button, StatusModal } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { type MultisigEvent, type MultisigOperation } from '@/domains/multisig';
import { buildMultisigTx, generateEventId } from '@/entities/multisig';
import { isProxyTypeTransaction, transactionService } from '@/entities/transaction';
import { proxiesModel } from '@/features/proxies';
import { operationsContextModel } from '../../model/context';
import { flexibleShellModel } from '../../model/flexible-shell-model';
import { multisigOperations } from '../../model/model';
import { rejectModel } from '../../model/reject-model';

type ResultProps = Pick<ComponentProps<typeof StatusModal>, 'title' | 'content' | 'description'>;

type Props = {
  api: ApiPromise;
  account?: Account;
  tx: Transaction;
  multisigTx?: MultisigOperation;
  txPayload: Uint8Array;
  signature: HexString;
  isReject?: boolean;
  onClose: () => void;
};

export const Submit = ({ api, tx, multisigTx, account, txPayload, signature, isReject, onClose }: Props) => {
  const { t } = useI18n();

  const [inProgress, toggleInProgress] = useToggle(true);
  const [successMessage, toggleSuccessMessage] = useToggle();
  const [errorMessage, setErrorMessage] = useState('');

  const multisigAccount = useUnit(operationsContextModel.$account);
  const wrappedTx = useUnit(rejectModel.$wrappedTx);

  useEffect(() => {
    submitExtrinsic(signature).catch(() => console.warn('Error getting signed extrinsics'));
  }, []);

  const submitExtrinsic = async (signature: HexString) => {
    const result = await transactionService.signAndSubmit(tx, signature, txPayload, api);

    if (result.executed) {
      const { params } = result;

      if (multisigTx && tx && account?.accountId) {
        const isReject =
          tx.type === TransactionType.BATCH_ALL
            ? tx.args.transactions.some((tx: Transaction) => tx.type === TransactionType.MULTISIG_CANCEL_AS_MULTI)
            : tx.type === TransactionType.MULTISIG_CANCEL_AS_MULTI;

        const updatedTx: MultisigOperation = { ...multisigTx };

        if (params.isFinalApprove) {
          updatedTx.status = params.multisigError ? 'error' : 'executed';
        }

        if (params.isFinalApprove && params.multisigError) {
          flexibleShellModel.events.rejectMultisig();
        }

        if (params.isFinalApprove && !params.multisigError && isProxyTypeTransaction(multisigTx)) {
          proxiesModel.findAllProxies();
        }

        if (isReject) {
          flexibleShellModel.events.rejectMultisig();

          if (tx.type === TransactionType.BATCH_ALL && wrappedTx && wrappedTx.multisigTx && multisigAccount) {
            const multisigData = buildMultisigTx(wrappedTx.coreTx, wrappedTx.multisigTx, params, multisigAccount);

            await multisigOperations.addTransactions([multisigData]);
          }

          updatedTx.status = 'cancelled';
        }

        const eventStatus = isReject ? 'reject' : 'approve';
        const event: MultisigEvent = {
          id: generateEventId(updatedTx.id, account.accountId, eventStatus),
          status: eventStatus,
          accountId: account.accountId,
          extrinsicHash: params.extrinsicHash,
          blockCreated: pjsSchema.helpers.toBlockHeight(params.timepoint.height),
          indexCreated: params.timepoint.index,
          timestamp: Date.now(),
        };

        updatedTx.events.push(event);

        await multisigOperations.updateTransactions([updatedTx]);
      }

      toggleSuccessMessage();
      setTimeout(() => {
        toggleSuccessMessage();
        onClose();
      }, 2000);
    } else {
      setErrorMessage(result.error);
    }
    toggleInProgress();
  };

  const getResultProps = (): ResultProps => {
    if (inProgress) {
      return {
        title: t(isReject ? 'operation.rejectInProgress' : 'operation.inProgress'),
        content: <Animation variant="loading" loop />,
      };
    }
    if (successMessage) {
      return {
        title: t(isReject ? 'operation.successRejectMessage' : 'operation.successMessage'),
        content: <Animation variant="success" />,
      };
    }
    if (errorMessage) {
      return {
        title: t('operation.feeErrorTitle'),
        content: <Animation variant="error" />,
        description: errorMessage,
      };
    }

    return { title: '' };
  };

  const closeErrorMessage = () => {
    onClose();
    setErrorMessage('');
  };

  return (
    <StatusModal isOpen={Boolean(inProgress || errorMessage || successMessage)} {...getResultProps()} onClose={onClose}>
      {errorMessage && <Button onClick={closeErrorMessage}>{t('operation.submitErrorButton')}</Button>}
    </StatusModal>
  );
};
