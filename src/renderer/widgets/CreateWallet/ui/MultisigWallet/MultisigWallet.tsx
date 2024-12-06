import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type ComponentProps } from 'react';

import { useI18n } from '@/shared/i18n';
import { Step, cnTw, isStep } from '@/shared/lib/utils';
import { Modal } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { flowModel } from '../../model/flow-model';
import { formModel } from '../../model/form-model';

import { ConfirmationStep } from './ConfirmationStep';
import { NameNetworkSelection } from './NameNetworkSelection';
import { SelectSignatoriesThreshold } from './SelectSignatoriesThreshold';
import { SignerSelection } from './components/SignerSelection';

const MODAL_SIZE: Record<string, Pick<ComponentProps<typeof Modal>, 'size' | 'height'>> = {
  [Step.NAME_NETWORK]: { size: 'lg', height: 'full' },
  [Step.SIGNATORIES_THRESHOLD]: { size: 'lg', height: 'full' },
  [Step.SIGNER_SELECTION]: { size: 'sm', height: 'fit' },
  [Step.SIGN]: { size: 'md', height: 'fit' },
  [Step.CONFIRM]: { size: 'md', height: 'fit' },
  [Step.SUBMIT]: { size: 'md', height: 'fit' },
};

type Props = {
  onClose: () => void;
  onGoBack: () => void;
};

export const MultisigWallet = ({ onClose, onGoBack }: Props) => {
  const { t } = useI18n();

  const activeStep = useUnit(flowModel.$step);
  const {
    fields: { chainId },
  } = useForm(formModel.$createMultisigForm);

  if (isStep(activeStep, Step.SUBMIT)) {
    return <OperationSubmit isOpen onClose={onClose} />;
  }

  const modalTitle = (
    <div className="flex items-center justify-between">
      {isStep(activeStep, Step.SIGNER_SELECTION)
        ? t('createMultisigAccount.selectSigner')
        : t('createMultisigAccount.title')}
      {!isStep(activeStep, Step.NAME_NETWORK) && !isStep(activeStep, Step.SIGNER_SELECTION) && (
        <>
          <span className="mx-1">{t('createMultisigAccount.titleOn')}</span>
          <ChainTitle
            chainId={chainId.value}
            className="gap-x-1.5"
            fontClass="font-manrope text-header-title text-text-primary truncate"
          />
        </>
      )}
    </div>
  );

  return (
    <Modal isOpen size={MODAL_SIZE[activeStep].size} height={MODAL_SIZE[activeStep].height} onToggle={onClose}>
      <div className={cnTw({ 'mb-4': !isStep(activeStep, Step.SIGN) })}>
        <Modal.Title close>{modalTitle}</Modal.Title>
      </div>
      {isStep(activeStep, Step.NAME_NETWORK) && <NameNetworkSelection onGoBack={onGoBack} />}
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
