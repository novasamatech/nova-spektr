import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import type { Chain } from '@shared/core';
import { Step } from '../lib/types';
import { AddProxyForm } from './AddProxyForm';
import { Confirmation } from './Confirmation';
import { SignProxy } from './SignProxy';
import { SubmitProxy } from './SubmitProxy';
import { addProxyUtils } from '../lib/add-proxy-utils';
import { Callbacks, addProxyModel } from '../model/add-proxy-model';

type Props = Callbacks & {
  isOpen: boolean;
};
export const AddProxyModal = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();

  const step = useUnit(addProxyModel.$step);
  const chain = useUnit(addProxyModel.$chain);

  const [isModalOpen, closeModal] = useModalClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;

    addProxyModel.events.stepChanged(Step.INIT);
  }, [isOpen]);

  useEffect(() => {
    addProxyModel.events.callbacksChanged({ onClose: closeModal });
  }, [closeModal]);

  const getModalTitle = (step: Step, chain?: Chain) => {
    if (addProxyUtils.isInitStep(step) || !chain) return t('operations.modalTitles.addProxy');

    return <OperationTitle title={t('operations.modalTitles.addProxyOn')} chainId={chain.chainId} />;
  };

  if (addProxyUtils.isSubmitStep(step)) return <SubmitProxy isOpen={isModalOpen} onClose={closeModal} />;

  return (
    <BaseModal closeButton contentClass="" isOpen={isModalOpen} title={getModalTitle(step, chain)} onClose={closeModal}>
      {addProxyUtils.isInitStep(step) && <AddProxyForm onGoBack={closeModal} />}
      {addProxyUtils.isConfirmStep(step) && (
        <Confirmation onGoBack={() => addProxyModel.events.stepChanged(Step.INIT)} />
      )}
      {addProxyUtils.isSignStep(step) && <SignProxy onGoBack={() => addProxyModel.events.stepChanged(Step.CONFIRM)} />}
    </BaseModal>
  );
};
