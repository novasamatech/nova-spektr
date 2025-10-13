import { useUnit } from 'effector-react';
import { type ComponentProps, useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { OperationResult } from '@/entities/transaction';
import { submitUtils } from '../lib/submit-utils';
import { type SubmitStep } from '../lib/types';
import { type ErrorResult, type SuccessResult, submitModel } from '../model/submit-model';

type ResultProps = Pick<
  ComponentProps<typeof OperationResult>,
  'title' | 'description' | 'variant' | 'autoCloseTimeout'
>;

type Props = {
  isOpen: boolean;
  autoCloseTimeout?: number;
  onSuccess?: (results: SuccessResult[]) => void;
  onFail?: (results: ErrorResult[]) => void;
  onClose: () => void;
};

export const OperationSubmit = ({ autoCloseTimeout = 2000, isOpen, onSuccess, onFail, onClose }: Props) => {
  const { t } = useI18n();

  const submitStore = useUnit(submitModel.$submitStore);
  const failedTxs = useUnit(submitModel.$failedTxs);
  const succeedTxs = useUnit(submitModel.$succeedTxs);
  const { step, message } = useUnit(submitModel.$submitStep);

  useEffect(() => {
    if (submitStore) {
      submitModel.submitToNetwork();
    }
  }, [submitStore]);

  const handleModalClose = () => {
    if (submitUtils.isLoadingStep(step)) {
      return;
    }

    if (onSuccess && failedTxs.length === 0 && succeedTxs.length > 0) {
      onSuccess(succeedTxs);
    }

    if (onFail && failedTxs.length > 0) {
      onFail(failedTxs);
    }

    onClose();
  };

  const getResultProps = (step: SubmitStep, message: string): ResultProps => {
    if (submitUtils.isLoadingStep(step)) {
      return { title: t('transfer.inProgress'), variant: 'loading' };
    }

    if (submitUtils.isSuccessStep(step)) {
      return { title: t('transfer.successMessage'), variant: 'success', autoCloseTimeout: 2000 };
    }

    if (submitUtils.isWarningStep(step) && submitStore) {
      return {
        title: t('transfer.warningTitle', { failed: failedTxs.length, all: submitStore.length }),
        variant: 'warning',
        description: t('transfer.warningDescription'),
      };
    }

    return { title: t('operation.feeErrorTitle'), variant: 'error', description: message };
  };

  return (
    <OperationResult
      isOpen={isOpen}
      {...getResultProps(step, message)}
      autoCloseTimeout={!submitUtils.isLoadingStep(step) ? autoCloseTimeout : 0}
      onClose={handleModalClose}
    >
      {submitUtils.isErrorStep(step) && <Button onClick={onClose}>{t('operation.submitErrorButton')}</Button>}
    </OperationResult>
  );
};
