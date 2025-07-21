import { useGate, useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { Step } from '../lib/types';
import { callDataUtils } from '../lib/utils';
import { formModel } from '../model/form';

import { CallDataForm } from './CallDataForm';

export const CallDataSubmit = memo(() => {
  const { t } = useI18n();
  const [open, toggleModal] = useToggle(false);

  return (
    <>
      <Button pallet="secondary" size="sm" onClick={toggleModal}>
        {t('callData.title')}
      </Button>
      {open ? <CallDataSubmitModal onToggle={toggleModal} /> : null}
    </>
  );
});

export const CallDataSubmitModal = ({ onToggle }: { onToggle: VoidFunction }) => {
  useGate(formModel.flow);

  const { t } = useI18n();
  const step = useUnit(formModel.$step);

  if (callDataUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen onClose={onToggle} />;
  }

  return (
    <Modal isOpen size="md" height="fit" onToggle={onToggle}>
      <Modal.Title close>{t('callData.title')}</Modal.Title>
      <Modal.Content disableScroll>
        {callDataUtils.isInitStep(step) && <CallDataForm />}
        {
          callDataUtils.isConfirmStep(step) && null
          // <Confirmation
          //   secondaryActionButton={
          //     initiatorWallet &&
          //     basketUtils.isBasketAvailable(initiatorWallet) && (
          //       <Button pallet="secondary" onClick={() => formModel.events.txSaved()}>
          //         {t('operation.addToBasket')}
          //       </Button>
          //     )
          //   }
          //   onGoBack={() => formModel.events.stepChanged(Step.INIT)}
          // />
        }
        {callDataUtils.isSignStep(step) && <OperationSign onGoBack={() => formModel.stepChanged(Step.CONFIRM)} />}
      </Modal.Content>
    </Modal>
  );
};
