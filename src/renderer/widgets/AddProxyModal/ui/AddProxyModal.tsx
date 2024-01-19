import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { AddProxyForm } from './AddProxyForm';
import { ConfirmProxy } from './ConfirmProxy';
import { addProxyUtils } from '../lib/add-proxy-utils';
import { Callbacks, addProxyModel } from '../model/add-proxy-model';
import { proxyFormModel } from '../model/proxy-form-model';
import { Step } from '../lib/types';

type Props = Callbacks & {
  isOpen: boolean;
};
export const AddProxyModal = ({ isOpen, onClose }: Props) => {
  const step = useUnit(addProxyModel.$step);

  const [isModalOpen, closeModal] = useModalClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;

    proxyFormModel.events.formInitiated();
  }, [isOpen]);

  return (
    <BaseModal closeButton isOpen={isModalOpen} title="Add delegated authority (proxy)" onClose={closeModal}>
      {addProxyUtils.isInitStep(step) && <AddProxyForm onBack={closeModal} />}
      {addProxyUtils.isConfirmStep(step) && <ConfirmProxy onBack={() => addProxyModel.events.stepChanged(Step.INIT)} />}
      {addProxyUtils.isSignStep(step) && <div>Signing</div>}
      {/*{addProxyUtils.isSignStep(step) && <Signing onGoBack={() => addProxyModel.events.stepChanged(Step.CONFIRM)} />}*/}
      {addProxyUtils.isSubmitStep(step) && <div>Submit</div>}
    </BaseModal>
  );
};
