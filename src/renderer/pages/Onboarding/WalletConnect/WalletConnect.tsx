import { useUnit } from 'effector-react';
import QRCodeStyling from 'qr-code-styling';
import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@app/providers';
import { useStatusContext } from '@app/providers/context/StatusContext';
import { chainsService } from '@shared/api/network';
import novawallet_onboarding_tutorial from '@shared/assets/video/novawallet_onboarding_tutorial.mp4';
import novawallet_onboarding_tutorial_webm from '@shared/assets/video/novawallet_onboarding_tutorial.webm';
import { WalletType } from '@shared/core';
import { usePrevious } from '@shared/lib/hooks';
import { BaseModal, Button, HeaderTitleText, Loader, SmallTitleText } from '@shared/ui';
import { Animation } from '@shared/ui/Animation/Animation';
import { walletConnectModel, walletConnectUtils } from '@entities/walletConnect';
import { wcOnboardingModel } from '@pages/Onboarding/WalletConnect/model/wc-onboarding-model';

import { ManageStep } from './ManageStep';
import { EXPIRE_TIMEOUT, Step, WCQRConfig } from './lib/constants';
import { isNeedDisconnect } from './lib/utils';

type Props = {
  isOpen: boolean;
  size?: number;
  onClose: () => void;
  onComplete: () => void;
};

const qrCode = new QRCodeStyling(WCQRConfig);

export const WalletConnect = ({ isOpen, onClose, onComplete }: Props) => {
  const { t } = useI18n();

  const session = useUnit(walletConnectModel.$session);
  const client = useUnit(walletConnectModel.$client);
  const pairings = useUnit(walletConnectModel.$pairings);
  const uri = useUnit(walletConnectModel.$uri);
  const step = useUnit(wcOnboardingModel.$step);

  const previousPairings = usePrevious(pairings);

  const [pairingTopic, setPairingTopic] = useState<string>();

  const { showStatus } = useStatusContext();

  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      qrCode.append(ref.current);
    }
  }, [ref.current]);

  useEffect(() => {
    qrCode.update({
      data: uri,
    });
  }, [uri]);

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
    if (client && isOpen) {
      const chains = walletConnectUtils.getWalletConnectChains(chainsService.getChainsData());
      walletConnectModel.events.connect({ chains });
    }
  }, [client, isOpen]);

  useEffect(() => {
    const newPairing = pairings?.find((p) => !previousPairings?.find((pp) => pp.topic === p.topic));

    if (newPairing) {
      setPairingTopic(newPairing.topic);
    }
  }, [pairings.length]);

  const handleClose = () => {
    if (isNeedDisconnect(step)) {
      walletConnectModel.events.disconnectCurrentSessionStarted();
    }

    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} contentClass="flex h-full" panelClass="w-[944px] h-[576px]" onClose={handleClose}>
      {step === Step.SCAN && qrCode && (
        <>
          <div className="flex w-[472px] flex-col rounded-l-lg bg-white px-5 py-4">
            <HeaderTitleText className="mb-10">{t('onboarding.walletConnect.title')}</HeaderTitleText>
            <SmallTitleText className="mb-6">{t('onboarding.walletConnect.scanTitle')}</SmallTitleText>

            <div className="relative flex flex-1 items-center justify-center">
              <div className="absolute left-[50%] top-[50%] z-0 -translate-x-1/2 -translate-y-1/2">
                <Loader color="primary" />
              </div>

              <div key="wallet-connect" className="z-10" ref={ref}></div>
            </div>

            <div className="flex items-end justify-between">
              <Button variant="text" onClick={handleClose}>
                {t('onboarding.backButton')}
              </Button>
            </div>
          </div>

          <div className="flex w-[472px] flex-col bg-black">
            <video className="h-full object-contain" autoPlay loop>
              <source src={novawallet_onboarding_tutorial_webm} type="video/webm" />
              <source src={novawallet_onboarding_tutorial} type="video/mp4" />
            </video>
          </div>
        </>
      )}

      {step === Step.MANAGE && session && pairingTopic && (
        <ManageStep
          type={WalletType.WALLET_CONNECT}
          accounts={session.namespaces.polkadot.accounts}
          pairingTopic={pairingTopic}
          sessionTopic={session.topic}
          onBack={walletConnectModel.events.disconnectCurrentSessionStarted}
          onComplete={onComplete}
        />
      )}
    </BaseModal>
  );
};
