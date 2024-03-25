import { useUnit } from 'effector-react';
import { ComponentProps, useEffect } from 'react';

import { Button } from '@shared/ui';
import { useI18n } from '@app/providers';
import { useTaskQueue } from '@shared/lib/hooks';
import { OperationResult } from '@entities/transaction';
import { useMultisigTx, useMultisigEvent } from '@entities/multisig';
import { SubmitStep } from '../lib/types';
import { submitProxyUtils } from '../lib/submit-utils';
import { submitModel } from '../model/submit-model';

type ResultProps = Pick<ComponentProps<typeof OperationResult>, 'title' | 'description' | 'variant'>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const Submit = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();

  const submitStore = useUnit(submitModel.$submitStore);
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
    if (submitProxyUtils.isLoadingStep(step)) {
      return { title: t('proxy.submitInProgress'), variant: 'loading' };
    }
    if (submitProxyUtils.isSuccessStep(step)) {
      return { title: t('proxy.submitSuccess'), variant: 'success' };
    }

    return { title: t('proxy.submitError'), variant: 'error', description: message };
  };

  return (
    <OperationResult isOpen={isOpen} {...getResultProps(step, message)} onClose={onClose}>
      {submitProxyUtils.isErrorStep(step) && <Button onClick={onClose}>{t('proxy.submitErrorButton')}</Button>}
    </OperationResult>
  );
};
