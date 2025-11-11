import { useGate, useUnit } from 'effector-react';
import { type ComponentProps, type PropsWithChildren, useState } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { Step, isStep, nonNullable } from '@/shared/lib/utils';
import { ConfirmModal, Modal } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { OperationSign } from '@/features/operations';
import { assignModel } from '../model/assign-model';
import { flexibleMultisigFeature } from '../model/feature';
import { flexibleMultisigModel } from '../model/flexible-multisig-create';
import { formModel } from '../model/form-model';

import { ConfirmationStep } from './ConfirmationStep';
import { NameNetworkSelection } from './NameNetworkSelection';
import { SelectSignatoriesThreshold } from './SelectSignatoriesThreshold';
import { SignerSelection } from './SignerSelection';

const MODAL_SIZE: Record<string, Pick<ComponentProps<typeof Modal>, 'size' | 'height'>> = {
  [Step.NAME_NETWORK]: { size: 'lg', height: 'full' },
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

export const FlexibleMultisigWallet = ({ isOpen, onToggle, onGoBack, children }: Props) => {
  const { t } = useI18n();
  useGate(flexibleMultisigFeature.gate);

  const [isConfirmOpen, setConfirmOpen] = useState<boolean>(false);

  const pureCreated = useUnit(assignModel.$pureCreated);
  const flexibleMultisigCreated = useUnit(assignModel.$flexibleMultisigCreated);

  const activeStep = useUnit(flexibleMultisigModel.$step);
  const {
    fields: { chainId },
  } = useForm(formModel.form);

  const modalTitle = isStep(activeStep, Step.NAME_NETWORK) ? (
    t('createMultisigAccount.flexibleMultisig.title')
  ) : isStep(activeStep, Step.SIGN) && nonNullable(pureCreated) ? (
    <OperationTitle title={t('createMultisigAccount.flexibleMultisig.titleAssignControl')} chainId={chainId.value} />
  ) : (
    <OperationTitle title={t('createMultisigAccount.flexibleMultisig.titleOn')} chainId={chainId.value} />
  );

  const handleClose = () => {
    if (isStep(activeStep, Step.NAME_NETWORK) || flexibleMultisigCreated) {
      return onToggle(false);
    }

    return setConfirmOpen(true);
  };

  const isConfirmCreation = isStep(activeStep, Step.CONFIRM) && nonNullable(pureCreated);

  const confirmModalText = isConfirmCreation
    ? 'createMultisigAccount.flexibleMultisig.closeCreationDescription'
    : 'createMultisigAccount.flexibleMultisig.leaveDescription';

  const confirmModalTitle = isConfirmCreation
    ? 'createMultisigAccount.flexibleMultisig.closeCreationTitle'
    : 'createMultisigAccount.flexibleMultisig.leaveTitle';

  return (
    <>
      <Modal
        isOpen={isOpen}
        size={MODAL_SIZE[activeStep].size}
        height={MODAL_SIZE[activeStep].height}
        onToggle={handleClose}
      >
        <Modal.Trigger>{children}</Modal.Trigger>
        <Modal.Title close>{modalTitle}</Modal.Title>
        {isStep(activeStep, Step.NAME_NETWORK) && <NameNetworkSelection onGoBack={onGoBack} />}
        {isStep(activeStep, Step.SIGNATORIES_THRESHOLD) && <SelectSignatoriesThreshold />}
        {isStep(activeStep, Step.SIGNER_SELECTION) && <SignerSelection />}
        {(isStep(activeStep, Step.CONFIRM) || isStep(activeStep, Step.SUBMIT)) && (
          <ConfirmationStep onToggle={onToggle} onClose={handleClose} />
        )}
        {isStep(activeStep, Step.SIGN) && (
          <Modal.Content>
            <OperationSign onGoBack={() => flexibleMultisigModel.stepChanged(Step.CONFIRM)} />
          </Modal.Content>
        )}
      </Modal>
      <ConfirmModal
        title={t(confirmModalTitle)}
        description={t(confirmModalText)}
        cancelText={t('general.button.cancelButton')}
        confirmText={t('createMultisigAccount.flexibleMultisig.leaveButton')}
        type="warning"
        isOpen={isConfirmOpen}
        onConfirm={() => onToggle(false)}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
};
