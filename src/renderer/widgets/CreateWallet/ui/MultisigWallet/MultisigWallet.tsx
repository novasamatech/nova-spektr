import { useForm } from 'effector-forms';
import { useEffect } from 'react';
import { useUnit } from 'effector-react';
import noop from 'lodash/noop';

import { BaseModal, HeaderTitleText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { ConfirmationStep } from './ConfirmationStep';
import { NameNetworkSelection } from './NameNetworkSelection';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';
import { flowModel } from '../../model/flow-model';
import { createMultisigUtils } from '../../lib/create-multisig-utils';
import { formModel } from '../../model/form-model';
import { SelectSignatoriesThreshold } from './SelectSignatoriesThreshold';
import { Step } from '../../lib/types';
import { OperationSign, OperationSubmit } from '@features/operations';
import { ChainTitle } from '@entities/chain';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

export const MultisigWallet = ({ isOpen, onClose, onComplete }: Props) => {
  const { t } = useI18n();

  const {
    fields: { chain },
  } = useForm(formModel.$createMultisigForm);
  const activeStep = useUnit(flowModel.$step);

  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);

  useEffect(() => {
    flowModel.events.callbacksChanged({ onComplete });
  }, [onComplete]);

  useEffect(() => {
    if (isOpen && !isModalOpen) {
      toggleIsModalOpen();
    }

    if (!isOpen && isModalOpen) {
      closeMultisigModal({ closeAll: false });
      flowModel.output.flowFinished();
    }
  }, [isOpen]);

  const closeMultisigModal = (params: { complete?: boolean; closeAll?: boolean } = { closeAll: true }) => {
    toggleIsModalOpen();
    flowModel.output.flowFinished();

    setTimeout(params?.complete ? onComplete : params?.closeAll ? onClose : noop, DEFAULT_TRANSITION);
  };

  if (createMultisigUtils.isSubmitStep(activeStep))
    return <OperationSubmit isOpen={isModalOpen} onClose={closeMultisigModal} />;

  const modalTitle = (
    <div className="flex justify-between items-center py-3 w-[464px] bg-white rounded-tl-lg rounded-tr-lg">
      <HeaderTitleText className="py-[3px] flex">
        {t('createMultisigAccount.title')}
        {createMultisigUtils.isNotFirstStep(activeStep) && (
          <>
            <span className="mx-1">on</span>
            <ChainTitle
              chainId={chain.value.chainId}
              className="gap-x-1.5"
              fontClass="font-manrope text-header-title text-text-primary truncate"
            />
          </>
        )}
      </HeaderTitleText>
    </div>
  );

  return (
    <>
      <BaseModal
        closeButton
        title={modalTitle}
        isOpen={isModalOpen}
        contentClass="flex"
        panelClass={createMultisigUtils.isSignStep(activeStep) ? 'w-[440px]' : 'w-[784px]'}
        onClose={closeMultisigModal}
      >
        {createMultisigUtils.isNameNetworkStep(activeStep) && <NameNetworkSelection />}
        {createMultisigUtils.isSignatoriesThresholdStep(activeStep) && <SelectSignatoriesThreshold />}
        {createMultisigUtils.isConfirmStep(activeStep) && <ConfirmationStep chain={chain.value} />}
        {createMultisigUtils.isSignStep(activeStep) && (
          <OperationSign onGoBack={() => flowModel.events.stepChanged(Step.CONFIRM)} />
        )}
      </BaseModal>
    </>
  );
};
