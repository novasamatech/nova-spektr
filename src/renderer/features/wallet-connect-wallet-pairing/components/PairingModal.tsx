import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { noop } from 'lodash';
import { type PropsWithChildren, memo, useEffect } from 'react';

import { type StatusModalProps, useStatusContext } from '@/app/providers';
import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button, HeaderTitleText, Icon, type IconNames, SmallTitleText, StatusModal } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { Carousel, Modal } from '@/shared/ui-kit';
import { EXPIRE_TIMEOUT, Step } from '../lib/constants';
import { type WalletTypeName } from '../lib/types';
import { pairingFormModel } from '../model/form';

import { PairingForm } from './PairingForm';
import { WalletConnectQrCode } from './WalletConnectQrCode';
import novawallet_onboarding_tutorial from './assets/novawallet_onboarding_tutorial.mp4';
import novawallet_onboarding_tutorial_webm from './assets/novawallet_onboarding_tutorial.webm';

const showCompleteStatus = (t: TFunction, showStatus: (props: StatusModalProps) => Promise<void>) => {
  const WalletLogo: Record<WalletTypeName, IconNames> = {
    [WalletType.WALLET_CONNECT]: 'walletConnectOnboarding',
    [WalletType.NOVA_WALLET]: 'novaWalletOnboarding',
  };

  return (walletName: string, type: WalletTypeName) => {
    showStatus({
      title: walletName,
      description: t('onboarding.walletConnect.pairedDescription'),
      content: (
        <div className="flex h-20 items-center justify-center gap-1">
          <Icon name="logo" size={56} />
          <div className="h-0 w-3 rounded-sm border-[1.5px] border-text-positive"></div>
          <Icon name="checkmarkOutline" className="text-text-positive" size={18} />
          <div className="h-0 w-3 rounded-sm border-[1.5px] border-text-positive"></div>
          <Icon name={WalletLogo[type]} size={56} />
        </div>
      ),
    });
  };
};

type Props = PropsWithChildren<{
  variant: 'novawallet' | 'walletconnect';
}>;

export const PairingModal = memo(({ variant, children }: Props) => {
  const { t } = useI18n();

  const { showStatus } = useStatusContext();

  const session = useUnit(pairingFormModel.$session);
  const uri = useUnit(pairingFormModel.$uri);
  const step = useUnit(pairingFormModel.$step);
  const state = useUnit(pairingFormModel.flow.state);

  const open = state.type === variant;

  useEffect(() => {
    if (!open) return;

    const timeout = setTimeout(() => toggleModal(false), EXPIRE_TIMEOUT);

    return () => {
      clearTimeout(timeout);
    };
  }, [open]);

  const toggleModal = (open: boolean) => {
    if (open) {
      pairingFormModel.flow.open({ type: variant, onComplete: showCompleteStatus(t, showStatus) });
    } else {
      pairingFormModel.flow.shut();
    }
  };

  const goToScan = () => {
    pairingFormModel.reset();
    pairingFormModel.flow.open({ type: variant, onComplete: noop });
  };

  const closeStatusModal = () => {
    pairingFormModel.reset();
    pairingFormModel.flow.shut();
  };

  const header = t(`onboarding.${variant === 'novawallet' ? 'novaWallet' : 'walletConnect'}.title`);
  const scanTitle = t(`onboarding.${variant === 'novawallet' ? 'novaWallet' : 'walletConnect'}.scanTitle`);

  if (step === Step.REJECT) {
    return (
      <>
        <StatusModal
          isOpen={open}
          content={<Animation variant="error" />}
          title={t('onboarding.walletConnect.rejected')}
          onClose={closeStatusModal}
        />
        {children}
      </>
    );
  }

  return (
    <Modal size="xl" isOpen={open} onToggle={toggleModal}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Content disableScroll>
        <div className="relative min-h-[600px]">
          <Carousel item={step.toString()} fixedHeight>
            <Carousel.Item id={Step.SCAN.toString()} index={0}>
              <div className="flex h-full w-full">
                <div className="flex w-full max-w-[472px] min-w-96 flex-col rounded-l-lg bg-white px-5 py-4">
                  <HeaderTitleText className="mb-10">{header}</HeaderTitleText>
                  <SmallTitleText className="mb-6">{scanTitle}</SmallTitleText>

                  <div className="py-7">
                    <WalletConnectQrCode uri={uri} type={variant} />
                  </div>

                  <div className="mt-auto">
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
                <PairingForm
                  type={variant === 'novawallet' ? WalletType.NOVA_WALLET : WalletType.WALLET_CONNECT}
                  onBack={goToScan}
                />
              ) : null}
            </Carousel.Item>
          </Carousel>
        </div>
      </Modal.Content>
    </Modal>
  );
});
