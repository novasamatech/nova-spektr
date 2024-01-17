import { useUnit } from 'effector-react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { Callbacks, addProxyModel } from '../model/add-proxy-model';
import { addProxyUtils } from '../lib/add-proxy-utils';
import { InitProxyForm } from './InitProxyForm';
import { ConfirmProxy } from './ConfirmProxy';
import { Step } from '../lib/types';

type Props = Callbacks & {
  isOpen: boolean;
};
export const AddProxyModal = ({ isOpen, onClose }: Props) => {
  const step = useUnit(addProxyModel.$steps);

  const [isModalOpen, closeModal] = useModalClose(isOpen, onClose);

  return (
    <BaseModal closeButton isOpen={isModalOpen} title="Add delegated authority (proxy)" onClose={closeModal}>
      {addProxyUtils.isInitStep(step) && <InitProxyForm onBack={closeModal} />}
      {addProxyUtils.isConfirmStep(step) && <ConfirmProxy onBack={() => addProxyModel.events.stepChanged(Step.INIT)} />}
      {addProxyUtils.isSignStep(step) && <div>Signing</div>}
      {/*{addProxyUtils.isSignStep(step) && <Signing onGoBack={() => addProxyModel.events.stepChanged(Step.CONFIRM)} />}*/}
      {addProxyUtils.isSubmitStep(step) && <div>Submit</div>}
    </BaseModal>
  );
};
