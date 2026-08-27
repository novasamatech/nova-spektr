import { u8aToHex } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type ComponentProps, type ComponentType, type PropsWithChildren, useEffect, useState } from 'react';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { Carousel, Modal } from '@/shared/ui-kit';
import { type SeedInfo } from '@/entities/transaction';
import { IDENTITY_CHAIN } from '../lib/constants';
import { pairingFormModel } from '../model/pairing-form-model';

import { ManageSingleshard } from './ManageSingleshard';
import { ManageVault } from './ManageVault/ManageVault';
import { ScanStep } from './ScanStep';

type QrCodeType = 'singleshard' | 'polkadot_vault';

type PairingProps = ComponentProps<typeof ManageSingleshard> | ComponentProps<typeof ManageVault>;

const PairingComponent: Record<QrCodeType, ComponentType<PairingProps>> = {
  singleshard: ManageSingleshard,
  polkadot_vault: ManageVault,
};

export const PairingModal = ({ children }: PropsWithChildren) => {
  const open = useUnit(pairingFormModel.flow.status);

  const [activeStep, setActiveStep] = useState<'scan' | 'pair'>('scan');
  const [seedInfo, setSeedInfo] = useState<SeedInfo | null>(null);
  const [qrType, setQrType] = useState<QrCodeType | null>(null);

  useEffect(() => {
    if (nullable(seedInfo)) return;

    pairingFormModel.seedScanned(pjsSchema.helpers.toAccountId(u8aToHex(seedInfo.multiSigner.public)));

    if (!seedInfo.name && seedInfo.derivedKeys.length === 0) {
      setQrType('singleshard');
    } else {
      setQrType('polkadot_vault');
    }

    setActiveStep('pair');
  }, [seedInfo]);

  useEffect(() => {
    if (nullable(seedInfo) || qrType !== 'singleshard') return;

    pairingFormModel.requestIdentity({
      chainId: IDENTITY_CHAIN,
      accounts: [pjsSchema.helpers.toAccountId(u8aToHex(seedInfo.multiSigner.public))],
    });
  }, [qrType, seedInfo]);

  const toggleModal = (open: boolean) => {
    if (open) {
      setActiveStep('scan');
      setSeedInfo(null);
      setQrType(null);
      pairingFormModel.flow.open();
    } else {
      pairingFormModel.flow.close();
    }
  };

  const Component = qrType ? PairingComponent[qrType] : null;

  return (
    <Modal size="xl" height="lg" isOpen={open} onToggle={toggleModal}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Content disableScroll>
        <Carousel item={activeStep} fixedHeight>
          <Carousel.Item id="scan" index={0}>
            <ScanStep onBack={() => toggleModal(false)} onComplete={setSeedInfo} />
          </Carousel.Item>
          <Carousel.Item id="pair" index={1}>
            {nonNullable(Component) && nonNullable(seedInfo) ? (
              <Component
                seedInfo={seedInfo}
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
