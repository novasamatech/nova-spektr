import { u8aToHex } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type ComponentProps, type ComponentType, type PropsWithChildren, useEffect, useState } from 'react';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { Carousel, Modal } from '@/shared/ui-kit';
import { type SeedInfo, VaultFeatures } from '@/entities/transaction';
import { IDENTITY_CHAIN } from '../lib/constants';
import { pairingFormModel } from '../model/pairing-form-model';

import { ManageSingleshard } from './ManageSingleshard/ManageSingleshard';
import { ManageVault } from './ManageVault/ManageVault';
import { ScanStep } from './ScanStep/ScanStep';

type QrCodeType = 'singleshard' | 'polkadot_vault';

const isDynamicDerivationSupport = (seedInfo: SeedInfo): boolean => {
  return seedInfo.features?.some(feature => feature.VaultFeatures === VaultFeatures.DYNAMIC_DERIVATIONS) ?? false;
};

type PairingProps = ComponentProps<typeof ManageSingleshard> | ComponentProps<typeof ManageVault>;

const PairingComponent: Record<QrCodeType, ComponentType<PairingProps>> = {
  singleshard: ManageSingleshard,
  polkadot_vault: ManageVault,
};

export const PairingModal = ({ children }: PropsWithChildren) => {
  const open = useUnit(pairingFormModel.flow.status);

  const [activeStep, setActiveStep] = useState<'scan' | 'pair'>('scan');
  const [qrPayload, setQrPayload] = useState<SeedInfo[]>([]);
  const [qrType, setQrType] = useState<QrCodeType | null>(null);

  const Component = qrType ? PairingComponent[qrType] : null;

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

    if (isSingleQr && (isPlainQr || withoutDerivationPaths)) {
      setQrType('singleshard');
    } else {
      // TODO: handle this case
      console.error('Multishard not supported!');
    }
  }, [qrPayload]);

  useEffect(() => {
    const seedInfo = qrPayload.at(0);

    if (nullable(seedInfo) || qrType !== 'singleshard') return;

    pairingFormModel.requestIdentity({
      chainId: IDENTITY_CHAIN,
      accounts: [pjsSchema.helpers.toAccountId(u8aToHex(seedInfo.multiSigner.public))],
    });
  }, [qrType, qrPayload]);

  const onReceiveQr = (payload: SeedInfo[]) => {
    setQrPayload(payload);
    setActiveStep('pair');
  };

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

  return (
    <Modal size="xl" height="lg" isOpen={open} onToggle={toggleModal}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Content disableScroll>
        <Carousel item={activeStep} fixedHeight>
          <Carousel.Item id="scan" index={0}>
            <ScanStep onBack={() => toggleModal(false)} onComplete={onReceiveQr} />
          </Carousel.Item>
          <Carousel.Item id="pair" index={1}>
            {nonNullable(Component) ? (
              <Component
                seedInfo={qrPayload}
                onBack={() => setActiveStep('scan')}
                onClose={() => toggleModal(false)}
                onComplete={() => toggleModal(false)}
              />
            ) : null}
          </Carousel.Item>
        </Carousel>
      </Modal.Content>
    </Modal>
  );
};
