import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { AddProxyForm } from './AddProxyForm';
import { Confirmation } from './Confirmation';
import { SignProxy } from './SignProxy';
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
    <BaseModal
      closeButton
      contentClass=""
      isOpen={isModalOpen}
      title="Add delegated authority (proxy)"
      onClose={closeModal}
    >
      {addProxyUtils.isInitStep(step) && <AddProxyForm onBack={closeModal} onSubmit={addProxyModel.events.txCreated} />}
      {addProxyUtils.isConfirmStep(step) && <Confirmation onBack={() => addProxyModel.events.stepChanged(Step.INIT)} />}
      {addProxyUtils.isSignStep(step) && (
        <SignProxy
          onGoBack={() => addProxyModel.events.stepChanged(Step.CONFIRM)}
          onSubmit={() => addProxyModel.events.stepChanged(Step.SUBMIT)}
        />
      )}
      {addProxyUtils.isSubmitStep(step) && <div>Submit</div>}
    </BaseModal>
  );
};
