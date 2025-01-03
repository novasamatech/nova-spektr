import { useUnit } from 'effector-react';
import { type PropsWithChildren, useEffect, useState } from 'react';

import { Carousel, Modal } from '@/shared/ui-kit';
import { type SeedInfo, VaultFeatures } from '@/entities/transaction';
import { pairingFormModel } from '../model/pairing-form-model';

import { ManageMultishard } from './ManageMultishard/ManageMultishard';
import { ManageSingleshard } from './ManageSingleshard/ManageSingleshard';
import { ManageVault } from './ManageVault/ManageVault';
import { ScanStep } from './ScanStep/ScanStep';

const isDynamicDerivationSupport = (seedInfo: SeedInfo): boolean => {
  return seedInfo.features?.some(feature => feature.VaultFeatures === VaultFeatures.DYNAMIC_DERIVATIONS) ?? false;
};

type Step = 'scan' | 'manage';
type QrCodeType = 'singleshard' | 'multishard' | 'polkadot_vault';

export const PairingFormModal = ({ children }: PropsWithChildren) => {
  const open = useUnit(pairingFormModel.flow.status);

  const [activeStep, setActiveStep] = useState<Step>('scan');
  const [qrPayload, setQrPayload] = useState<SeedInfo[]>([]);
  const [qrType, setQrType] = useState<QrCodeType | null>(null);

  const toggleModal = (open: boolean) => {
    if (open) {
      setActiveStep('scan');
      setQrPayload([]);
      setQrType(null);
      pairingFormModel.flow.open();
    } else {
      pairingFormModel.flow.close();
    }
  };

  useEffect(() => {
    if (qrPayload.length === 0) return;

    const seedInfo = qrPayload.at(0);
    if (!seedInfo) return;

    const withoutDerivedKeys = seedInfo.derivedKeys.length === 0;

    if (isDynamicDerivationSupport(seedInfo) && withoutDerivedKeys) {
      setQrType('polkadot_vault');

      return;
    }

    const isEmptyName = seedInfo.name === '';
    const withoutDerivationPaths = seedInfo.derivedKeys.every(d => !d.derivationPath);
    const isSingleQr = qrPayload.length === 1;
    const isPlainQr = withoutDerivedKeys && isEmptyName;

    const isSingleshard = isSingleQr && (isPlainQr || withoutDerivationPaths);

    setQrType(isSingleshard ? 'singleshard' : 'multishard');
  }, [qrPayload]);

  const onReceiveQr = (payload: SeedInfo[]) => {
    setQrPayload(payload);
    setActiveStep('manage');
  };

  return (
    <Modal size="xl" height="lg" isOpen={open} onToggle={toggleModal}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Content disableScroll>
        <Carousel item={activeStep} fixedHeight>
          <Carousel.Item id="scan" index={0}>
            <ScanStep onBack={() => toggleModal(false)} onComplete={onReceiveQr} />
          </Carousel.Item>
          <Carousel.Item id="manage" index={1}>
            {qrType === 'singleshard' && (
              <ManageSingleshard
                seedInfo={qrPayload}
                onBack={() => setActiveStep('scan')}
                onClose={() => toggleModal(false)}
                onComplete={() => toggleModal(false)}
              />
            )}
            {qrType === 'multishard' && (
              <ManageMultishard
                seedInfo={qrPayload}
                onBack={() => setActiveStep('scan')}
                onClose={() => toggleModal(false)}
                onComplete={() => toggleModal(false)}
              />
            )}
            {qrType === 'polkadot_vault' && (
              <ManageVault
                seedInfo={qrPayload}
                onBack={() => setActiveStep('scan')}
                onClose={() => toggleModal(false)}
                onComplete={() => toggleModal(false)}
              />
            )}
          </Carousel.Item>
        </Carousel>
      </Modal.Content>
    </Modal>
  );
};
