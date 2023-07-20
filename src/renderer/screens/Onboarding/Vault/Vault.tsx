import { useEffect, useState } from 'react';

import { SeedInfo } from '@renderer/components/common/QrCode/common/types';
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

  useEffect(() => {
    isOpen && setActiveStep(Step.SCAN);
  }, [isOpen]);

  const onReceiveQr = (payload: SeedInfo[]) => {
    setQrPayload(payload);
    setActiveStep(Step.MANAGE);
  };

  const isPlainQr =
    qrPayload?.length === 1 &&
    ((qrPayload[0].derivedKeys.length === 0 && qrPayload[0].name === '') ||
      qrPayload[0].derivedKeys.every((d) => !d.derivationPath));

  const closeModal = () => {
    onClose();
  };

  const complete = () => {
    onComplete();
  };

  return (
    <BaseModal
      closeButton
      isOpen={isOpen}
      contentClass="flex h-full"
      panelClass="w-[944px] h-[576px]"
      onClose={closeModal}
    >
      {activeStep === Step.SCAN && <ScanStep onBack={closeModal} onNextStep={onReceiveQr} />}
      {activeStep === Step.MANAGE && qrPayload && (
        <>
          {isPlainQr ? (
            <ManageStepSingle seedInfo={qrPayload} onBack={() => setActiveStep(Step.SCAN)} onComplete={complete} />
          ) : (
            <ManageStep seedInfo={qrPayload} onBack={() => setActiveStep(Step.SCAN)} onComplete={complete} />
          )}
        </>
      )}
    </BaseModal>
  );
};

export default Vault;
