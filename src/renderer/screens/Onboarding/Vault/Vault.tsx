import { useState } from 'react';

import { SeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import ScanStep from './ScanStep/ScanStep';
import ManageStep from './ManageStep/ManageStep';
import ManageStepSingle from './ManageStepSingle/ManageStepSingle';
import { BaseModal } from '@renderer/components/ui-redesign';

const enum Step {
  SCAN,
  MANAGE,
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

const Vault = ({ isOpen, onClose, onComplete }: Props) => {
  const [activeStep, setActiveStep] = useState<Step>(Step.SCAN);
  const [qrPayload, setQrPayload] = useState<SeedInfo[]>();

  const onReceiveQr = (payload: SeedInfo[]) => {
    setQrPayload(payload);
    setActiveStep(Step.MANAGE);
  };

  const isPlainQr =
    qrPayload?.length === 1 &&
    ((qrPayload[0].derivedKeys.length === 0 && qrPayload[0].name === '') ||
      qrPayload[0].derivedKeys.every((d) => !d.derivationPath));

  const onCloseModal = () => {
    onClose();
    setActiveStep(Step.SCAN);
  };

  return (
    <BaseModal
      contentClass="flex h-full"
      panelClass="w-[944px] h-[576px]"
      isOpen={isOpen}
      closeButton
      onClose={onCloseModal}
    >
      {activeStep === Step.SCAN && <ScanStep onBack={onCloseModal} onNextStep={onReceiveQr} />}
      {activeStep === Step.MANAGE && qrPayload && (
        <>
          {isPlainQr ? (
            <ManageStepSingle seedInfo={qrPayload} onBack={() => setActiveStep(Step.SCAN)} onComplete={onComplete} />
          ) : (
            <ManageStep seedInfo={qrPayload} onBack={() => setActiveStep(Step.SCAN)} onComplete={onComplete} />
          )}
        </>
      )}
    </BaseModal>
  );
};

export default Vault;
