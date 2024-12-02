import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type ComponentProps } from 'react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { DEFAULT_TRANSITION, cnTw, isStep } from '@/shared/lib/utils';
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

const MODAL_SIZE: Record<Step, Pick<ComponentProps<typeof Modal>, 'size' | 'height'>> = {
  [Step.NAME_NETWORK]: { size: 'lg', height: 'full' },
  [Step.SIGNATORIES_THRESHOLD]: { size: 'lg', height: 'full' },
  [Step.SIGNER_SELECTION]: { size: 'sm', height: 'fit' },
  [Step.SIGN]: { size: 'md', height: 'fit' },
  [Step.CONFIRM]: { size: 'md', height: 'fit' },
  [Step.SUBMIT]: { size: 'md', height: 'fit' },
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

export const MultisigWallet = ({ isOpen, onComplete }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, closeModal] = useModalClose(isOpen, flowModel.output.flowFinished);
  const {
    fields: { chainId },
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
    <div className="flex w-[464px] items-center justify-between rounded-tl-lg rounded-tr-lg bg-white">
      <HeaderTitleText className="flex py-[3px]">
        {isStep(activeStep, Step.SIGNER_SELECTION)
          ? t('createMultisigAccount.selectSigner')
          : t('createMultisigAccount.title')}
        {createMultisigUtils.isNotFirstStep(activeStep) && !isStep(activeStep, Step.SIGNER_SELECTION) && (
          <>
            <span className="mx-1">{t('createMultisigAccount.titleOn')}</span>
            <ChainTitle
              chainId={chainId.value}
              className="gap-x-1.5"
              fontClass="font-manrope text-header-title text-text-primary truncate"
            />
          </>
        )}
      </HeaderTitleText>
    </div>
  );

  return (
    <Modal
      size={MODAL_SIZE[activeStep].size}
      height={MODAL_SIZE[activeStep].height}
      isOpen={isModalOpen}
      onToggle={handleClose}
    >
      <div className={cnTw({ 'mb-4': !isStep(activeStep, Step.SIGN) })}>
        <Modal.Title close>{modalTitle}</Modal.Title>
      </div>
      {isStep(activeStep, Step.NAME_NETWORK) && <NameNetworkSelection onGoBack={() => handleClose(false)} />}
      {isStep(activeStep, Step.SIGNATORIES_THRESHOLD) && <SelectSignatoriesThreshold />}
      {isStep(activeStep, Step.SIGNER_SELECTION) && <SignerSelection />}
      {isStep(activeStep, Step.CONFIRM) && <ConfirmationStep />}
      {isStep(activeStep, Step.SIGN) && (
        <Modal.Content>
          <OperationSign onGoBack={() => flowModel.events.stepChanged(Step.CONFIRM)} />
        </Modal.Content>
      )}
    </Modal>
  );
};
