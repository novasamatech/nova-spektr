import { useGate, useUnit } from 'effector-react';
import { type ComponentProps, type PropsWithChildren } from 'react';

import { useI18n } from '@/shared/i18n';
import { Step, isStep } from '@/shared/lib/utils';
import { Modal } from '@/shared/ui-kit';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { flowModel } from '../model/flow-model';

import { ConfirmationStep } from './ConfirmationStep';
import { SelectSignatoriesThreshold } from './SelectSignatoriesThreshold';

const MODAL_SIZE: Record<string, Pick<ComponentProps<typeof Modal>, 'size' | 'height'>> = {
  [Step.SIGNATORIES_THRESHOLD]: { size: 'lg', height: 'full' },
  [Step.SIGNER_SELECTION]: { size: 'sm', height: 'fit' },
  [Step.SIGN]: { size: 'md', height: 'fit' },
  [Step.CONFIRM]: { size: 'md', height: 'fit' },
  [Step.SUBMIT]: { size: 'md', height: 'fit' },
};

type Props = PropsWithChildren<{
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  onGoBack: () => void;
}>;

export const MultisigWallet = ({ isOpen, onToggle, onGoBack, children }: Props) => {
  useGate(flowModel.flow);
  const { t } = useI18n();

  const activeStep = useUnit(flowModel.$step);

  if (isStep(activeStep, Step.SUBMIT)) {
    return <OperationSubmit isOpen={isOpen} onClose={() => onToggle(false)} />;
  }

  return (
    <Modal
      isOpen={isOpen}
      size={MODAL_SIZE[activeStep].size}
      height={MODAL_SIZE[activeStep].height}
      onToggle={onToggle}
    >
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('createMultisigAccount.title')}</Modal.Title>
      {isStep(activeStep, Step.SIGNATORIES_THRESHOLD) && <SelectSignatoriesThreshold onGoBack={onGoBack} />}
      {/* {isStep(activeStep, Step.SIGNER_SELECTION) && <SignerSelection />} */}
      {isStep(activeStep, Step.CONFIRM) && <ConfirmationStep />}
      {isStep(activeStep, Step.SIGN) && (
        <Modal.Content>
          <OperationSign onGoBack={() => flowModel.stepChanged(Step.CONFIRM)} />
        </Modal.Content>
      )}
    </Modal>
  );
};
