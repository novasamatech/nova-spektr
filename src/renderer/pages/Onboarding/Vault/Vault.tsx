import { useEffect, useState } from 'react';

import { SeedInfo } from '@renderer/components/common/QrCode/common/types';
import ScanStep from './ScanStep/ScanStep';
import { ManageMultishard } from './ManageMultishard/ManageMultishard';
import { ManageSingleshard } from './ManageSingleshard/ManageSingleshard';
import { BaseModal } from '@shared/ui';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';
import { useToggle } from '@shared/lib/hooks';

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
  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);

  const [activeStep, setActiveStep] = useState<Step>(Step.SCAN);
  const [qrPayload, setQrPayload] = useState<SeedInfo[]>();

  useEffect(() => {
    if (isOpen) {
      setActiveStep(Step.SCAN);
    }

    if (isOpen && !isModalOpen) {
      toggleIsModalOpen();
    }

    if (!isOpen && isModalOpen) {
      closeVaultModal();
    }
  }, [isOpen]);

  const onReceiveQr = (payload: SeedInfo[]) => {
    setQrPayload(payload);
    setActiveStep(Step.MANAGE);
  };

  const isPlainQr =
    qrPayload?.length === 1 &&
    ((qrPayload[0].derivedKeys.length === 0 && qrPayload[0].name === '') ||
      qrPayload[0].derivedKeys.every((d) => !d.derivationPath));

  const closeVaultModal = (params?: { complete: boolean }) => {
    toggleIsModalOpen();

    setTimeout(params?.complete ? onComplete : onClose, DEFAULT_TRANSITION);
  };

  return (
    <BaseModal
      closeButton
      isOpen={isModalOpen}
      contentClass="flex h-full"
      panelClass="w-[944px] h-[576px]"
      onClose={closeVaultModal}
    >
      {activeStep === Step.SCAN && <ScanStep onBack={closeVaultModal} onNextStep={onReceiveQr} />}
      {activeStep === Step.MANAGE && qrPayload && (
        <>
          {isPlainQr ? (
            <ManageSingleshard
              seedInfo={qrPayload}
              onBack={() => setActiveStep(Step.SCAN)}
              onComplete={() => closeVaultModal({ complete: true })}
            />
          ) : (
            <ManageMultishard
              seedInfo={qrPayload}
              onBack={() => setActiveStep(Step.SCAN)}
              onComplete={() => closeVaultModal({ complete: true })}
            />
          )}
        </>
      )}
    </BaseModal>
  );
};

export default Vault;
