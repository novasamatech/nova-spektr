import { useEffect, useState } from 'react';

import { SeedInfo } from '@renderer/components/common/QrCode/common/types';
import ScanStep from './ScanStep/ScanStep';
import { ManageMultishard } from './ManageMultishard/ManageMultishard';
import { ManageSingleshard } from './ManageSingleshard/ManageSingleshard';
import { ManageDynamicDerivations } from './ManageDynamicDerivations/ManageDynamicDerivations';
import { BaseModal } from '@shared/ui';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';
import { useToggle } from '@shared/lib/hooks';
import { VaultFeatures } from '@renderer/components/common/QrCode/common/constants';

const isDynamicDerivationSupport = (seedInfo: SeedInfo): boolean => {
  const dynamicDerivationsExist = seedInfo.features?.some(
    (feature) => feature.VaultFeatures === VaultFeatures.DYNAMIC_DERIVATIONS,
  );

  return Boolean(dynamicDerivationsExist);
};

const enum Step {
  SCAN,
  MANAGE,
}

const enum QrCodeType {
  DYNAMIC_DERIVATIONS = 'DYNAMIC_DERIVATIONS',
  MULTISHARD = 'MULTISHARD',
  SINGLESHARD = 'SINGLESHARD',
}

type ManageProps = {
  seedInfo: SeedInfo[];
  onBack: () => void;
  onComplete: () => void;
};

const ManageFlow: Record<QrCodeType, (props: ManageProps) => JSX.Element | null> = {
  [QrCodeType.DYNAMIC_DERIVATIONS]: (props) => <ManageDynamicDerivations {...props} />,
  [QrCodeType.MULTISHARD]: (props) => <ManageMultishard {...props} />,
  [QrCodeType.SINGLESHARD]: (props) => <ManageSingleshard {...props} />,
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

const Vault = ({ isOpen, onClose, onComplete }: Props) => {
  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);

  const [activeStep, setActiveStep] = useState<Step>(Step.SCAN);
  const [qrPayload, setQrPayload] = useState<SeedInfo[]>();
  const [qrType, setQrType] = useState<QrCodeType>();

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

  useEffect(() => {
    if (!qrPayload) return;

    const withoutDerivedKeys = qrPayload[0].derivedKeys.length === 0;

    if (isDynamicDerivationSupport(qrPayload[0]) && withoutDerivedKeys) {
      setQrType(QrCodeType.DYNAMIC_DERIVATIONS);

      return;
    }

    const isEmptyName = qrPayload[0].name === '';
    const withoutDerivationPaths = qrPayload[0].derivedKeys.every((d) => !d.derivationPath);

    const isPlainQr = qrPayload?.length === 1 && ((withoutDerivedKeys && isEmptyName) || withoutDerivationPaths);

    setQrType(isPlainQr ? QrCodeType.SINGLESHARD : QrCodeType.MULTISHARD);
  }, [qrPayload]);

  const onReceiveQr = (payload: SeedInfo[]) => {
    setQrPayload(payload);
    setActiveStep(Step.MANAGE);
  };

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
      {activeStep === Step.MANAGE &&
        qrPayload &&
        qrType &&
        ManageFlow[qrType]({
          seedInfo: qrPayload,
          onBack: () => setActiveStep(Step.SCAN),
          onComplete: () => closeVaultModal({ complete: true }),
        })}
    </BaseModal>
  );
};

export default Vault;
