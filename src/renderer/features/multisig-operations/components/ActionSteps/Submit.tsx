import { type ApiPromise } from '@polkadot/api';
import { type ComponentProps, useEffect, useState } from 'react';

import { type HexString, type Transaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { Button, StatusModal } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import {
  type AnyAccount,
  type MultisigEvent,
  type MultisigOperation,
  multisigOperation,
  transactionService,
} from '@/domains/network';
import { multisigOperationService } from '@/domains/network';
import { getExtrinsic, isProxyTypeTransaction } from '@/entities/transaction';
import { proxiesModel } from '@/features/proxies';

type ResultProps = Pick<ComponentProps<typeof StatusModal>, 'title' | 'content' | 'description'>;

type Props = {
  api: ApiPromise;
  account?: AnyAccount;
  tx: Transaction;
  operation?: MultisigOperation;
  txPayload: Uint8Array;
  signature: HexString;
  isReject?: boolean;
  onClose: () => void;
};

export const Submit = ({ api, tx, operation, account, txPayload, signature, isReject, onClose }: Props) => {
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

      if (operation && tx && account?.accountId) {
        const updatedTx: MultisigOperation = { ...operation };

        if (params.isFinalApprove) {
          updatedTx.status = params.multisigError ? 'error' : 'executed';
        }

        if (
          params.isFinalApprove &&
          !params.multisigError &&
          isProxyTypeTransaction(operation.transaction ?? undefined)
        ) {
          proxiesModel.findAllProxies();
        }

        const eventStatus = isReject ? 'reject' : 'approve';
        const event: MultisigEvent = {
          id: multisigOperationService.getEventId(updatedTx.id, account.accountId, eventStatus),
          status: eventStatus,
          accountId: account.accountId,
          extrinsicHash: params.extrinsicHash,
          blockCreated: pjsSchema.helpers.toBlockHeight(params.timepoint.height),
          indexCreated: params.timepoint.index,
          timestamp: Date.now(),
        };

        updatedTx.events.push(event);

        await multisigOperation.updateOperations([updatedTx]);
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
