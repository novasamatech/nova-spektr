import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useStatusContext } from '@/app/providers';
import { chainsService } from '@/shared/api/network';
import novawallet_onboarding_tutorial from '@/shared/assets/video/novawallet_onboarding_tutorial.mp4';
import novawallet_onboarding_tutorial_webm from '@/shared/assets/video/novawallet_onboarding_tutorial.webm';
import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BaseModal, Button, HeaderTitleText, SmallTitleText } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { walletConnectModel, walletConnectUtils } from '@/entities/walletConnect';
import { WalletConnectQrCode } from '@/features/wallet-pairing-wallet-connect';
import { wcOnboardingModel } from '@/pages/Onboarding/WalletConnect/model/wc-onboarding-model';

import { ManageStep } from './ManageStep';
import { EXPIRE_TIMEOUT, Step } from './lib/constants';
import { isNeedDisconnect } from './lib/utils';

type Props = {
  isOpen: boolean;
  size?: number;
  onClose: () => void;
  onComplete: () => void;
};

export const NovaWallet = ({ isOpen, onClose, onComplete }: Props) => {
  const { t } = useI18n();

  const session = useUnit(walletConnectModel.$session);
  const provider = useUnit(walletConnectModel.$provider);
  const uri = useUnit(walletConnectModel.$uri);
  const step = useUnit(wcOnboardingModel.$step);

  const { showStatus } = useStatusContext();

  useEffect(() => {
    if (isOpen) {
      wcOnboardingModel.events.onboardingStarted();
    }

    const timeout = isOpen && setTimeout(handleClose, EXPIRE_TIMEOUT);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (step === Step.REJECT) {
      showStatus({
        title: t('onboarding.walletConnect.rejected'),
        content: <Animation variant="error" />,
      });
      handleClose();
    }
  }, [step]);

  useEffect(() => {
    if (provider && isOpen) {
      const chains = walletConnectUtils.getWalletConnectChains(chainsService.getChainsData());
      walletConnectModel.events.connect({ chains });
    }
  }, [provider, isOpen]);

  const handleClose = () => {
    if (isNeedDisconnect(step)) {
      walletConnectModel.events.disconnectCurrentSessionStarted();
    }

    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      contentClass="flex h-full"
      panelClass="w-modal-xl h-modal overflow-hidden"
      onClose={handleClose}
    >
      {step === Step.SCAN && (
        <>
          <div className="flex w-full min-w-96 max-w-[472px] flex-col rounded-l-lg bg-white px-5 py-4">
            <HeaderTitleText className="mb-10">{t('onboarding.novaWallet.title')}</HeaderTitleText>
            <SmallTitleText className="mb-6">{t('onboarding.novaWallet.scanTitle')}</SmallTitleText>

            <WalletConnectQrCode uri={uri} type="novawallet" />

            <div className="flex items-end justify-between">
              <Button variant="text" onClick={handleClose}>
                {t('onboarding.backButton')}
              </Button>
            </div>
          </div>

          <div className="flex w-full flex-col bg-black">
            <video className="h-full object-contain" autoPlay loop>
              <source src={novawallet_onboarding_tutorial_webm} type="video/webm" />
              <source src={novawallet_onboarding_tutorial} type="video/mp4" />
            </video>
          </div>
        </>
      )}

      {step === Step.MANAGE && session && (
        <ManageStep
          type={WalletType.NOVA_WALLET}
          accounts={session.namespaces.polkadot.accounts}
          pairingTopic={session.pairingTopic}
          sessionTopic={session.topic}
          onBack={walletConnectModel.events.disconnectCurrentSessionStarted}
          onComplete={onComplete}
        />
      )}
    </BaseModal>
  );
};
