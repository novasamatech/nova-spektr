import { useForm } from 'effector-forms';
import { useGate, useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Step, isStep } from '@/shared/lib/utils';
import { Modal } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { flexibleMultisigModel } from '../model/flexible-multisig-create';
import { formModel } from '../model/form-model';
import { flexibleMultisigFeature } from '../model/status';

import { ConfirmationStep } from './ConfirmationStep';
import { NameNetworkSelection } from './NameNetworkSelection';
import { SelectSignatoriesThreshold } from './SelectThreshold/SelectSignatoriesThreshold';
import { SignerSelection } from './SignerSelection';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onGoBack: () => void;
};

export const FlexibleMultisigWallet = ({ isOpen, onClose, onGoBack }: Props) => {
  const { t } = useI18n();
  useGate(flexibleMultisigFeature.gate);

  const activeStep = useUnit(flexibleMultisigModel.$step);
  const {
    fields: { chain },
  } = useForm(formModel.$createMultisigForm);

  if (isStep(activeStep, Step.SUBMIT)) {
    return <OperationSubmit isOpen={isOpen} onClose={onClose} />;
  }

  const modalTitle = (
    <div className="flex items-center justify-between">
      {isStep(activeStep, Step.SIGNER_SELECTION)
        ? t('createMultisigAccount.selectSigner')
        : t('createMultisigAccount.flexibleMultisig.title')}
      {!isStep(activeStep, Step.NAME_NETWORK) && !isStep(activeStep, Step.SIGNER_SELECTION) && (
        <>
          <span className="mx-1">{t('createMultisigAccount.titleOn')}</span>
          <ChainTitle
            chainId={chain.value.chainId}
            className="gap-x-1.5"
            fontClass="font-manrope text-header-title text-text-primary truncate"
          />
        </>
      )}
    </div>
  );
  console.log(activeStep);

  return (
    <>
      <Modal.Title close>{modalTitle}</Modal.Title>
      <Modal.Content>
        {isStep(activeStep, Step.NAME_NETWORK) && <NameNetworkSelection onGoBack={onGoBack} />}
        {isStep(activeStep, Step.SIGNATORIES_THRESHOLD) && <SelectSignatoriesThreshold />}
        {isStep(activeStep, Step.SIGNER_SELECTION) && <SignerSelection />}
        {isStep(activeStep, Step.CONFIRM) && <ConfirmationStep />}
        {isStep(activeStep, Step.SIGN) && (
          <OperationSign onGoBack={() => flexibleMultisigModel.events.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </>
  );
};
