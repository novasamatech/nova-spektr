import { useUnit } from 'effector-react';
import { type PropsWithChildren, memo, useEffect } from 'react';

import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button, HeaderTitleText, SmallTitleText, StatusModal } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { Carousel, Modal } from '@/shared/ui-kit';
import { EXPIRE_TIMEOUT, Step } from '../lib/constants';
import { pairingForm } from '../model/pairingForm';

import { ManageStep } from './ManageStep';
import { WalletConnectQrCode } from './WalletConnectQrCode';
import novawallet_onboarding_tutorial from './assets/novawallet_onboarding_tutorial.mp4';
import novawallet_onboarding_tutorial_webm from './assets/novawallet_onboarding_tutorial.webm';

type Props = PropsWithChildren<{
  variant: 'novawallet' | 'walletconnect';
}>;

export const PairingModal = memo(({ variant, children }: Props) => {
  const { t } = useI18n();

  const session = useUnit(pairingForm.$session);
  const uri = useUnit(pairingForm.$uri);
  const step = useUnit(pairingForm.$step);
  const open = useUnit(pairingForm.flow.state) === variant;

  useEffect(() => {
    if (!open) return;

    const timeout = setTimeout(() => toggleModal(false), EXPIRE_TIMEOUT);

    return () => clearTimeout(timeout);
  }, [open]);

  const goToScan = () => {
    pairingForm.reset();
    pairingForm.flow.open(variant);
  };

  const toggleModal = (open: boolean) => {
    if (open) {
      pairingForm.flow.open(variant);
    } else {
      pairingForm.flow.close(null);
    }
  };

  const header = variant === 'novawallet' ? t('onboarding.novaWallet.title') : t('onboarding.walletConnect.title');
  const scanTitle =
    variant === 'novawallet' ? t('onboarding.novaWallet.scanTitle') : t('onboarding.walletConnect.scanTitle');

  if (step === Step.REJECT) {
    return (
      <StatusModal
        isOpen={open}
        content={<Animation variant="error" />}
        title={t('onboarding.walletConnect.rejected')}
        onClose={() => toggleModal(false)}
      />
    );
  }

  return (
    <Modal size="xl" height="lg" isOpen={open} onToggle={toggleModal}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Content disableScroll>
        <Carousel item={step.toString()} fixedHeight>
          <Carousel.Item id={Step.SCAN.toString()} index={0}>
            <div className="flex h-full w-full">
              <div className="flex w-full min-w-96 max-w-[472px] flex-col rounded-l-lg bg-white px-5 py-4">
                <HeaderTitleText className="mb-10">{header}</HeaderTitleText>
                <SmallTitleText className="mb-6">{scanTitle}</SmallTitleText>

                <div className="py-7">
                  <WalletConnectQrCode uri={uri} type={variant} />
                </div>

                <div className="flex items-end justify-between">
                  <Button variant="text" onClick={() => toggleModal(false)}>
                    {t('onboarding.backButton')}
                  </Button>
                </div>
              </div>

              <div className="flex w-full flex-col bg-black duration-500 animate-in fade-in">
                <video className="h-full object-contain" autoPlay loop>
                  <source src={novawallet_onboarding_tutorial_webm} type="video/webm" />
                  <source src={novawallet_onboarding_tutorial} type="video/mp4" />
                </video>
              </div>
            </div>
          </Carousel.Item>
          <Carousel.Item id={Step.MANAGE.toString()} index={1}>
            {session ? (
              <ManageStep
                type={variant === 'novawallet' ? WalletType.NOVA_WALLET : WalletType.WALLET_CONNECT}
                onBack={goToScan}
                onComplete={() => toggleModal(false)}
              />
            ) : null}
          </Carousel.Item>
        </Carousel>
      </Modal.Content>
    </Modal>
  );
});
