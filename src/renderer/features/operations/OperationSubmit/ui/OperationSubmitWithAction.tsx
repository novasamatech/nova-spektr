import { useUnit } from 'effector-react';
import { type ComponentProps, useEffect, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Animation, Button, FootnoteText, SmallTitleText } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { OperationResult } from '@/entities/transaction';
import { submitUtils } from '../lib/submit-utils';
import { type SubmitStep } from '../lib/types';
import { submitModel } from '../model/submit-model';

type ResultProps = Pick<
  ComponentProps<typeof OperationResult>,
  'title' | 'description' | 'variant' | 'autoCloseTimeout'
>;

type Props = {
  isOpen: boolean;
  autoCloseTimeout?: number;
  onClose: () => void;
  onSubmit: () => void;
};

export const OperationSubmitWithAction = ({ autoCloseTimeout, isOpen, onClose, onSubmit }: Props) => {
  const { t } = useI18n();

  const submitStore = useUnit(submitModel.$submitStore);
  const failedTxs = useUnit(submitModel.$failedTxs);
  const { step, message } = useUnit(submitModel.$submitStep);

  const computedAutoCloseTimeout = useMemo(() => {
    if (submitUtils.isLoadingStep(step)) {
      return 0;
    }

    if (submitUtils.isSuccessStep(step)) {
      return autoCloseTimeout ?? 2000;
    }

    return autoCloseTimeout ?? 0;
  }, [autoCloseTimeout, step]);

  useEffect(() => {
    if (submitStore) {
      submitModel.submitToNetwork();
    }
  }, [submitStore]);

  const handleModalClose = () => {
    if (submitUtils.isLoadingStep(step)) {
      return;
    }

    onClose();
  };

  const getResultProps = (step: SubmitStep, message: string): ResultProps => {
    if (submitUtils.isLoadingStep(step)) {
      return { title: t('transfer.inProgress'), variant: 'loading' };
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

  const isSuccessful = submitUtils.isSuccessStep(step);

  return isSuccessful ? (
    <StatusSuccessModal isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} />
  ) : (
    <OperationResult
      isOpen={isOpen}
      {...getResultProps(step, message)}
      autoCloseTimeout={computedAutoCloseTimeout}
      onClose={handleModalClose}
    >
      {submitUtils.isErrorStep(step) && <Button onClick={onClose}>{t('operation.submitErrorButton')}</Button>}
    </OperationResult>
  );
};

type PropsModal = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

const StatusSuccessModal = ({ isOpen, onClose, onSubmit }: PropsModal) => {
  const { t } = useI18n();

  return (
    <Modal size="fit" isOpen={isOpen} onToggle={onClose}>
      <Modal.Content>
        <div className="flex w-[240px] flex-col items-center">
          <Animation variant="success" />
          <SmallTitleText className="my-2">{t('operations.operationCreated')}</SmallTitleText>
          <FootnoteText className="text-text-secondary" align="center">
            {t('operations.createdOperationDescription')}
          </FootnoteText>
        </div>
      </Modal.Content>
      <Modal.Footer>
        <Button size="sm" className="w-full" onClick={onSubmit}>
          {t('operations.viewOperation')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
