import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Dropdown, Modal } from '@/shared/ui-kit';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { Step } from '../lib/types';
import { callDataUtils } from '../lib/utils';
import { formModel } from '../model/form';

import { CallDataForm } from './CallDataForm';
import { Confirmation } from './Confirmation';

export const CallDataSubmit = memo(() => {
  const { t } = useI18n();
  const step = useUnit(formModel.$step);

  const [isOpen, closeModal] = useModalClose(!callDataUtils.isNoneStep(step), formModel.flowFinished);

  if (callDataUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isOpen} onClose={closeModal} />;
  }

  const handleModalToggle = (open: boolean) => {
    if (open) {
      formModel.flowStarted();
    } else {
      closeModal();
    }
  };

  return (
    <Modal isOpen={isOpen} size="md" height="fit" onToggle={handleModalToggle}>
      <Modal.Trigger>
        <Dropdown.Item>{t('navigation.callDataLabel')}</Dropdown.Item>
      </Modal.Trigger>
      <Modal.Title close>{t('callData.title')}</Modal.Title>
      <Modal.Content disableScroll>
        {callDataUtils.isInitStep(step) && <CallDataForm />}
        {callDataUtils.isConfirmStep(step) && <Confirmation onGoBack={() => formModel.stepChanged(Step.INIT)} />}
        {callDataUtils.isSignStep(step) && <OperationSign onGoBack={() => formModel.stepChanged(Step.CONFIRM)} />}
      </Modal.Content>
    </Modal>
  );
});
