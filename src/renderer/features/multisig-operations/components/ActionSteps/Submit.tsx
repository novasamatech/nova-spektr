import { type ApiPromise } from '@polkadot/api';
import { type ComponentProps, useEffect, useState } from 'react';

import { type HexString, type Transaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button, StatusModal } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { type MultisigOperation, accountSync, transactionService } from '@/domains/network';
import { getExtrinsic, isProxyTypeTransaction } from '@/entities/transaction';

type ResultProps = Pick<ComponentProps<typeof StatusModal>, 'title' | 'content' | 'description'>;

type Props = {
  api: ApiPromise;
  tx: Transaction;
  operation?: MultisigOperation;
  txPayload: Uint8Array;
  signature: HexString;
  isReject?: boolean;
  onClose: () => void;
};

export const Submit = ({ api, tx, operation, txPayload, signature, isReject, onClose }: Props) => {
  const { t } = useI18n();

  const [inProgress, toggleInProgress] = useToggle(true);
  const [successMessage, toggleSuccessMessage] = useToggle();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    submitExtrinsic(signature).catch(() => console.warn('Error getting signed extrinsics'));
  }, []);

  const submitExtrinsic = async (signature: HexString) => {
    const extrinsic = getExtrinsic[tx.type](tx.args, api);
    const result = await transactionService.submitExtrinsic(extrinsic, signature, txPayload, tx.accountId, api);

    if (result.executed) {
      const { params } = result;

      // Sync accounts if proxy was added/removed
      if (
        operation &&
        params.isFinalApprove &&
        !params.multisigError &&
        isProxyTypeTransaction(operation.transaction ?? undefined)
      ) {
        accountSync.syncAccounts();
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
        title: t('operation.submitError'),
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
