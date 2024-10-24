import { useEffect, useState } from 'react';

import { useToggle } from '@/shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@/shared/lib/utils';
import { BaseModal } from '@/shared/ui';
import { type SeedInfo, VaultFeatures } from '@/entities/transaction';

import { ManageMultishard } from './ManageMultishard/ManageMultishard';
import { ManageSingleshard } from './ManageSingleshard/ManageSingleshard';
import { ManageVault } from './ManageVault/ManageVault';
import ScanStep from './ScanStep/ScanStep';

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
  SINGLESHARD = 'SINGLESHARD',
  MULTISHARD = 'MULTISHARD',
  POLKADOT_VAULT = 'POLKADOT_VAULT',
}

type ManageProps = {
  seedInfo: SeedInfo[];
  onBack: () => void;
  onClose: () => void;
  onComplete: () => void;
};

const ManageFlow: Record<QrCodeType, (props: ManageProps) => JSX.Element | null> = {
  [QrCodeType.SINGLESHARD]: (props) => <ManageSingleshard {...props} />,
  [QrCodeType.MULTISHARD]: (props) => <ManageMultishard {...props} />,
  [QrCodeType.POLKADOT_VAULT]: (props) => <ManageVault {...props} />,
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};
export const Vault = ({ isOpen, onClose, onComplete }: Props) => {
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
      setQrType(QrCodeType.POLKADOT_VAULT);

      return;
    }

    const isEmptyName = qrPayload[0].name === '';
    const withoutDerivationPaths = qrPayload[0].derivedKeys.every((d) => !d.derivationPath);
    const isSingleQr = qrPayload.length === 1;
    const isPlainQr = withoutDerivedKeys && isEmptyName;

    const isSingleshard = isSingleQr && (isPlainQr || withoutDerivationPaths);

    setQrType(isSingleshard ? QrCodeType.SINGLESHARD : QrCodeType.MULTISHARD);
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
      isOpen={isModalOpen}
      contentClass="flex h-full"
      panelClass="w-modal-xl h-modal overflow-hidden"
      onClose={closeVaultModal}
    >
      {activeStep === Step.SCAN && <ScanStep onBack={closeVaultModal} onNextStep={onReceiveQr} />}
      {activeStep === Step.MANAGE &&
        qrPayload &&
        qrType &&
        ManageFlow[qrType]({
          seedInfo: qrPayload,
          onBack: () => setActiveStep(Step.SCAN),
          onClose: closeVaultModal,
          onComplete: () => closeVaultModal({ complete: true }),
        })}
    </BaseModal>
  );
};
