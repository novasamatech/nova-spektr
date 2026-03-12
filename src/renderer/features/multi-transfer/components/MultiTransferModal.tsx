import { useUnit } from 'effector-react';
import { useState } from 'react';

import { type Chain } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { ConfirmModal, Dropdown, Modal } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { formModel } from '../model/form';
import { Step } from '../types';
import { multiTransferUtils } from '../utils';

import { Confirmation } from './Confirmation';
import { MultiTransferForm } from './MultiTransferForm';

const FORM_ID = 'multi-transfer-form';

export const MultiTransferModal = () => {
  const { t } = useI18n();

  const step = useUnit(formModel.$step);
  const {
    fields: { chain },
  } = useForm(formModel.form);

  const [isOpen, closeModal] = useModalClose(!multiTransferUtils.isNoneStep(step), formModel.flowFinished);
  const [showConfirm, setShowConfirm] = useState(false);

  if (multiTransferUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isOpen} onClose={closeModal} />;
  }

  const getModalTitle = (chain: Chain | null) => {
    if (!chain) {
      return t('operations.modalTitles.multiTransfer');
    }

    return <OperationTitle title={t('operations.modalTitles.multiTransferOn')} chainId={chain.chainId} />;
  };

  const handleModalToggle = (open: boolean) => {
    if (open) {
      formModel.flowStarted();
    } else if (multiTransferUtils.isSignStep(step)) {
      setShowConfirm(true);
    } else {
      closeModal();
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} size="md" height="fit" onToggle={handleModalToggle}>
        <Modal.Trigger>
          <Dropdown.Item>{t('navigation.multiTransferLabel')}</Dropdown.Item>
        </Modal.Trigger>
        <Modal.Title close>{getModalTitle(chain.value)}</Modal.Title>
        <Modal.Content disableScroll>
          {multiTransferUtils.isInitStep(step) && <MultiTransferForm formId={FORM_ID} />}
          {multiTransferUtils.isConfirmStep(step) && <Confirmation onGoBack={() => formModel.stepChanged(Step.INIT)} />}
          {multiTransferUtils.isSignStep(step) && (
            <OperationSign onGoBack={() => formModel.stepChanged(Step.CONFIRM)} />
          )}
        </Modal.Content>
      </Modal>
      <ConfirmModal
        isOpen={showConfirm}
        title={t('operation.submitCloseConfirmTitle')}
        description={t('operation.submitCloseConfirmDescription')}
        cancelText={t('operation.submitCloseConfirmLeave')}
        confirmText={t('operation.submitCloseConfirmStay')}
        onCancel={() => {
          setShowConfirm(false);
          closeModal();
        }}
        onConfirm={() => setShowConfirm(false)}
      />
    </>
  );
};
