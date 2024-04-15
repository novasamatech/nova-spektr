import { useUnit } from 'effector-react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import type { Chain } from '@shared/core';
import { OperationSign, OperationSubmit } from '@features/operations';
import { Step } from '../lib/types';
import { AddProxyForm } from './AddProxyForm';
import { Confirmation } from './Confirmation';
import { addProxyUtils } from '../lib/add-proxy-utils';
import { addProxyModel } from '../model/add-proxy-model';

export const AddProxy = () => {
  const { t } = useI18n();

  const step = useUnit(addProxyModel.$step);
  const chain = useUnit(addProxyModel.$chain);

  const [isModalOpen, closeModal] = useModalClose(!addProxyUtils.isNoneStep(step), addProxyModel.output.flowClosed);

  const getModalTitle = (step: Step, chain?: Chain) => {
    if (addProxyUtils.isInitStep(step) || !chain) return t('operations.modalTitles.addProxy');

    return <OperationTitle title={t('operations.modalTitles.addProxyOn')} chainId={chain.chainId} />;
  };

  if (addProxyUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="max-h-full overflow-y-auto"
      isOpen={isModalOpen}
      title={getModalTitle(step, chain)}
      onClose={closeModal}
    >
      {addProxyUtils.isInitStep(step) && <AddProxyForm onGoBack={closeModal} />}
      {addProxyUtils.isConfirmStep(step) && (
        <Confirmation onGoBack={() => addProxyModel.events.stepChanged(Step.INIT)} />
      )}
      {addProxyUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => addProxyModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
