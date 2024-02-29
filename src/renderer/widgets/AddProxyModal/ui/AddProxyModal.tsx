import { useUnit } from 'effector-react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useNetworkData } from '@entities/network';
import { useI18n } from '@app/providers';
import { AddProxyForm } from './AddProxyForm';
import { Confirmation } from './Confirmation';
import { SignProxy } from './SignProxy';
import { addProxyUtils } from '../lib/add-proxy-utils';
import { Callbacks, addProxyModel } from '../model/add-proxy-model';
import { Step } from '../lib/types';
import { Chain } from '@shared/core';
import { useEffect } from 'react';

type Props = Callbacks & {
  isOpen: boolean;
};
export const AddProxyModal = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();

  const step = useUnit(addProxyModel.$step);
  const transaction = useUnit(addProxyModel.$transaction);

  const { chain } = useNetworkData(transaction?.chainId);

  const [isModalOpen, closeModal] = useModalClose(isOpen, onClose);

  useEffect(() => {
    addProxyModel.events.stepChanged(Step.INIT);
  }, []);

  const getModalTitle = (step: Step, chain?: Chain) => {
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
      {addProxyUtils.isConfirmStep(step) && <Confirmation />}
      {addProxyUtils.isSignStep(step) && <SignProxy />}
      {addProxyUtils.isSubmitStep(step) && <div>Submit</div>}
    </BaseModal>
  );
};
