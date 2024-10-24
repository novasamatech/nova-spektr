import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { DEFAULT_TRANSITION, isStep } from '@/shared/lib/utils';
import { HeaderTitleText } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { createMultisigUtils } from '../../lib/create-multisig-utils';
import { Step } from '../../lib/types';
import { flowModel } from '../../model/flow-model';
import { formModel } from '../../model/form-model';

import { ConfirmationStep } from './ConfirmationStep';
import { NameNetworkSelection } from './NameNetworkSelection';
import { SelectSignatoriesThreshold } from './SelectSignatoriesThreshold';
import { SignerSelection } from './components/SignerSelection';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

export const MultisigWallet = ({ isOpen, onComplete }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, closeModal] = useModalClose(isOpen, flowModel.output.flowFinished);
  const {
    fields: { chain },
  } = useForm(formModel.$createMultisigForm);
  const activeStep = useUnit(flowModel.$step);

  const handleClose = (open: boolean) => {
    if (!open) {
      setTimeout(onComplete, DEFAULT_TRANSITION);
      closeModal();
    }
  };

  if (isStep(activeStep, Step.SUBMIT)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={() => handleClose(false)} />;
  }

  const modalTitle = (
    <div className="flex w-[464px] items-center justify-between rounded-tl-lg rounded-tr-lg bg-white py-3">
      <HeaderTitleText className="flex py-[3px]">
        {isStep(activeStep, Step.SIGNER_SELECTION)
          ? t('createMultisigAccount.selectSigner')
          : t('createMultisigAccount.title')}
        {createMultisigUtils.isNotFirstStep(activeStep) && !isStep(activeStep, Step.SIGNER_SELECTION) && (
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

  const modalSize =
    isStep(activeStep, Step.SIGN) || isStep(activeStep, Step.CONFIRM) || isStep(activeStep, Step.SIGNER_SELECTION)
      ? 'md'
      : 'lg';

  return (
    <Modal size={modalSize} height="fit" isOpen={isModalOpen} onToggle={handleClose}>
      <Modal.Title close>{modalTitle}</Modal.Title>
      <Modal.Content>
        {isStep(activeStep, Step.NAME_NETWORK) && <NameNetworkSelection />}
        {isStep(activeStep, Step.SIGNATORIES_THRESHOLD) && <SelectSignatoriesThreshold />}
        {isStep(activeStep, Step.SIGNER_SELECTION) && <SignerSelection />}
        {isStep(activeStep, Step.CONFIRM) && <ConfirmationStep />}
        {isStep(activeStep, Step.SIGN) && <OperationSign onGoBack={() => flowModel.events.stepChanged(Step.CONFIRM)} />}
      </Modal.Content>
    </Modal>
  );
};
