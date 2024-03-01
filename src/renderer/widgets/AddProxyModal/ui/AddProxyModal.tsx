import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { AddProxyForm } from './AddProxyForm';
import { Confirmation } from './Confirmation';
import { SignProxy } from './SignProxy';
import { addProxyUtils } from '../lib/add-proxy-utils';
import { Callbacks, addProxyModel } from '../model/add-proxy-model';
import { Step } from '../lib/types';
import { Chain } from '@shared/core';

type Props = Callbacks & {
  isOpen: boolean;
};
export const AddProxyModal = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();

  const step = useUnit(addProxyModel.$step);
  const chain = useUnit(addProxyModel.$chain);

  const [isModalOpen, closeModal] = useModalClose(isOpen, onClose);

  useEffect(() => {
    addProxyModel.events.stepChanged(Step.INIT);
  }, []);

  const getModalTitle = (step: Step, chain: Chain | null) => {
    if (addProxyUtils.isInitStep(step) || !chain) return 'Add delegated authority (proxy)';

    return (
      <OperationTitle
        title={t('Add delegated authority (proxy) on ', { asset: chain.assets[0].symbol })}
        chainId={chain.chainId}
      />
    );
  };

  return (
    <BaseModal closeButton contentClass="" isOpen={isModalOpen} title={getModalTitle(step, chain)} onClose={closeModal}>
      {addProxyUtils.isInitStep(step) && <AddProxyForm onGoBack={closeModal} />}
      {addProxyUtils.isConfirmStep(step) && (
        <Confirmation onGoBack={() => addProxyModel.events.stepChanged(Step.INIT)} />
      )}
      {addProxyUtils.isSignStep(step) && <SignProxy onGoBack={() => addProxyModel.events.stepChanged(Step.CONFIRM)} />}
      {addProxyUtils.isSubmitStep(step) && <div>Submit</div>}
    </BaseModal>
  );
};
