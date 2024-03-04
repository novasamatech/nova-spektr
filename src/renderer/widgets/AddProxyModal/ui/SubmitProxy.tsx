import { useUnit } from 'effector-react';
import { ComponentProps } from 'react';

import { Button } from '@shared/ui';
import { useI18n } from '@app/providers';
import { OperationResult } from '@entities/transaction';
import { submitModel } from '../model/submit-model';
import { submitProxyUtils } from '../lib/submit-proxy-utils';
import { SubmitStep } from '../lib/types';

type ResultProps = Pick<ComponentProps<typeof OperationResult>, 'title' | 'description' | 'variant'>;

type Props = {
  onClose: () => void;
};

export const SubmitProxy = ({ onClose }: Props) => {
  const { t } = useI18n();

  const submitStore = useUnit(submitModel.$submitStore);
  const { step, message } = useUnit(submitModel.$submitStep);

  if (!submitStore) return null;

  const getResultProps = (step: SubmitStep, message: string): ResultProps => {
    if (submitProxyUtils.isLoadingStep(step)) {
      return { title: t('transfer.inProgress'), variant: 'loading' };
    }
    if (submitProxyUtils.isSuccessStep(step)) {
      return { title: t('transfer.successMessage'), variant: 'success' };
    }

    return { title: t('operation.feeErrorTitle'), variant: 'error', description: message };
  };

  return (
    <OperationResult isOpen {...getResultProps(step, message)} onClose={onClose}>
      {submitProxyUtils.isErrorStep(step) && <Button onClick={onClose}>{t('operation.feeErrorButton')}</Button>}
    </OperationResult>
  );
};
