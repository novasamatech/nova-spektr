import { useGate, useUnit } from 'effector-react';

import { type Chain } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { Modal } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { Step } from '../lib/types';
import { vestedTransferUtils } from '../lib/utils';
import { formModel } from '../model/form';

import { Confirmation } from './Confirmation';
import { VestedTransferForm } from './VestedTransferForm';

export const VestedTransferModal = ({ onToggle }: { onToggle: VoidFunction }) => {
  useGate(formModel.flow);

  const { t } = useI18n();
  const step = useUnit(formModel.$step);
  const {
    fields: { chain },
  } = useForm(formModel.form);

  if (vestedTransferUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen onClose={onToggle} />;
  }

  const getModalTitle = (chain: Chain | null) => {
    if (!chain) {
      return t('operations.modalTitles.vestedTransfer');
    }

    return <OperationTitle title={t('operations.modalTitles.vestedTransferOn')} chainId={chain.chainId} />;
  };

  return (
    <Modal isOpen size="md" height="fit" onToggle={onToggle}>
      <Modal.Title close>{getModalTitle(chain.value)}</Modal.Title>
      <Modal.Content disableScroll>
        {vestedTransferUtils.isInitStep(step) && <VestedTransferForm />}
        {vestedTransferUtils.isConfirmStep(step) && <Confirmation onGoBack={() => formModel.stepChanged(Step.INIT)} />}
        {vestedTransferUtils.isSignStep(step) && <OperationSign onGoBack={() => formModel.stepChanged(Step.CONFIRM)} />}
      </Modal.Content>
    </Modal>
  );
};
