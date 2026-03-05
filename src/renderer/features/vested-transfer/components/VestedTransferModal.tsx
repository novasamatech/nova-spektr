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
import { vestedTransferUtils } from '../utils';

import { Confirmation } from './Confirmation';
import { VestedTransferForm } from './VestedTransferForm';

export const VestedTransferModal = () => {
  const { t } = useI18n();

  const step = useUnit(formModel.$step);
  const {
    fields: { chain },
  } = useForm(formModel.form);

  const [isOpen, closeModal] = useModalClose(!vestedTransferUtils.isNoneStep(step), formModel.flowFinished);
  const [showConfirm, setShowConfirm] = useState(false);

  if (vestedTransferUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isOpen} onClose={closeModal} />;
  }

  const getModalTitle = (chain: Chain | null) => {
    if (!chain) {
      return t('operations.modalTitles.vestedTransfer');
    }

    return <OperationTitle title={t('operations.modalTitles.vestedTransferOn')} chainId={chain.chainId} />;
  };

  const handleModalToggle = (open: boolean) => {
    if (open) {
      formModel.flowStarted();
    } else if (vestedTransferUtils.isSignStep(step)) {
      setShowConfirm(true);
    } else {
      closeModal();
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} size="md" height="fit" onToggle={handleModalToggle}>
        <Modal.Trigger>
          <Dropdown.Item>{t('navigation.vestedTransfersLabel')}</Dropdown.Item>
        </Modal.Trigger>
        <Modal.Title close>{getModalTitle(chain.value)}</Modal.Title>
        <Modal.Content disableScroll>
          {vestedTransferUtils.isInitStep(step) && <VestedTransferForm />}
          {vestedTransferUtils.isConfirmStep(step) && (
            <Confirmation onGoBack={() => formModel.stepChanged(Step.INIT)} />
          )}
          {vestedTransferUtils.isSignStep(step) && (
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
