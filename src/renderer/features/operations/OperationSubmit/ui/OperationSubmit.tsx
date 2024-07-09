import { useUnit } from 'effector-react';
import { ComponentProps, useEffect } from 'react';

import { Button } from '@shared/ui';
import { useI18n } from '@app/providers';
import { useTaskQueue } from '@shared/lib/hooks';
import { OperationResult } from '@entities/transaction';
import { useMultisigTx, useMultisigEvent } from '@entities/multisig';
import { SubmitStep } from '../lib/types';
import { submitUtils } from '../lib/submit-utils';
import { submitModel } from '../model/submit-model';

type ResultProps = Pick<ComponentProps<typeof OperationResult>, 'title' | 'description' | 'variant'>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const OperationSubmit = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();

  const submitStore = useUnit(submitModel.$submitStore);
  const failedTxs = useUnit(submitModel.$failedTxs);
  const { step, message } = useUnit(submitModel.$submitStep);

  const { addTask } = useTaskQueue();
  const { addMultisigTx } = useMultisigTx({ addTask });
  const { addEventWithQueue } = useMultisigEvent({ addTask });

  useEffect(() => {
    submitModel.events.hooksApiChanged({ addMultisigTx, addEventWithQueue });
  }, [addMultisigTx, addEventWithQueue]);

  useEffect(() => {
    submitModel.events.submitStarted();
  }, []);

  if (!submitStore) return null;

  const getResultProps = (step: SubmitStep, message: string): ResultProps => {
    if (submitUtils.isLoadingStep(step)) {
      return { title: t('transfer.inProgress'), variant: 'loading' };
    }

    if (submitUtils.isSuccessStep(step)) {
      return { title: t('transfer.successMessage'), variant: 'success' };
    }

    if (submitUtils.iswarningStep(step)) {
      return {
        title: t('transfer.warningTitle', { failed: failedTxs.length, all: submitStore.txPayloads.length }),
        variant: 'warning',
        description: t('transfer.warningDescription'),
      };
    }

    return { title: t('operation.feeErrorTitle'), variant: 'error', description: message };
  };

  return (
    <OperationResult isOpen={isOpen} {...getResultProps(step, message)} onClose={onClose}>
      {submitUtils.isErrorStep(step) && <Button onClick={onClose}>{t('operation.submitErrorButton')}</Button>}
    </OperationResult>
  );
};
