import { useGate, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Dropdown, Modal } from '@/shared/ui-kit';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { Step } from '../lib/types';
import { callDataUtils } from '../lib/utils';
import { formModel } from '../model/form';

import { CallDataForm } from './CallDataForm';
import { Confirmation } from './Confirmation';

export const CallDataSubmit = memo(() => {
  const { t } = useI18n();
  const [isOpen, toggleModal] = useToggle(false);

  return (
    <>
      <Dropdown.Item onClick={toggleModal}>{t('navigation.callDataLabel')}</Dropdown.Item>
      <CallDataSubmitModal isOpen={isOpen} onToggle={toggleModal} />
    </>
  );
});

type Props = {
  isOpen: boolean;
  onToggle: VoidFunction;
};

export const CallDataSubmitModal = ({ isOpen, onToggle }: Props) => {
  useGate(formModel.flow);

  const { t } = useI18n();
  const step = useUnit(formModel.$step);

  if (callDataUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen onClose={onToggle} />;
  }

  return (
    <Modal isOpen={isOpen} size="md" height="fit" onToggle={onToggle}>
      <Modal.Title close>{t('callData.title')}</Modal.Title>
      <Modal.Content disableScroll>
        {callDataUtils.isInitStep(step) && <CallDataForm />}
        {callDataUtils.isConfirmStep(step) && <Confirmation onGoBack={() => formModel.stepChanged(Step.INIT)} />}
        {callDataUtils.isSignStep(step) && <OperationSign onGoBack={() => formModel.stepChanged(Step.CONFIRM)} />}
      </Modal.Content>
    </Modal>
  );
};
