import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@app/providers';
import { DEFAULT_TRANSITION } from '@/shared/lib/utils';
import { useModalClose } from '@shared/lib/hooks';
import { BaseModal, HeaderTitleText } from '@shared/ui';
import { ChainTitle } from '@entities/chain';
import { OperationSign, OperationSubmit } from '@features/operations';
import { createMultisigUtils } from '../../lib/create-multisig-utils';
import { Step } from '../../lib/types';
import { flowModel } from '../../model/flow-model';
import { formModel } from '../../model/form-model';

import { ConfirmationStep } from './ConfirmationStep';
import { NameNetworkSelection } from './NameNetworkSelection';
import { SelectSignatoriesThreshold } from './SelectSignatoriesThreshold';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

export const MultisigWallet = ({ isOpen, onClose, onComplete }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, closeModal] = useModalClose(isOpen, flowModel.output.flowFinished);
  const {
    fields: { chain },
  } = useForm(formModel.$createMultisigForm);
  const activeStep = useUnit(flowModel.$step);

  useEffect(() => {
    if (!isOpen && isModalOpen) {
      closeModal();
    }
  }, [isOpen]);

  const handleClose = (params?: { complete: boolean }) => {
    closeModal();
    setTimeout(params?.complete ? onComplete : onClose, DEFAULT_TRANSITION);
  };

  if (createMultisigUtils.isStep(activeStep, Step.SUBMIT)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={() => handleClose({ complete: true })} />;
  }

  const modalTitle = (
    <div className="flex justify-between items-center py-3 w-[464px] bg-white rounded-tl-lg rounded-tr-lg">
      <HeaderTitleText className="py-[3px] flex">
        {t('createMultisigAccount.title')}
        {createMultisigUtils.isNotFirstStep(activeStep) && (
          <>
            <span className="mx-1">{t('createMultisigAccount.titleOn')}</span>
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
        panelClass={createMultisigUtils.isStep(activeStep, Step.SIGN) ? 'w-[440px]' : 'w-[784px]'}
        onClose={handleClose}
      >
        {createMultisigUtils.isStep(activeStep, Step.NAME_NETWORK) && <NameNetworkSelection />}
        {createMultisigUtils.isStep(activeStep, Step.SIGNATORIES_THRESHOLD) && <SelectSignatoriesThreshold />}
        {createMultisigUtils.isStep(activeStep, Step.CONFIRM) && <ConfirmationStep chain={chain.value} />}
        {createMultisigUtils.isStep(activeStep, Step.SIGN) && (
          <OperationSign onGoBack={() => flowModel.events.stepChanged(Step.CONFIRM)} />
        )}
      </BaseModal>
    </>
  );
};
