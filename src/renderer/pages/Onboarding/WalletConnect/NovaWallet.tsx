import QRCodeStyling from 'qr-code-styling';
import { useEffect, useRef, useState } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { BaseModal, Button, HeaderTitleText, Loader, SmallTitleText } from '@shared/ui';
import { Animation } from '@shared/ui/Animation/Animation';
import { ManageStep } from './ManageStep';
import novawallet_onboarding_tutorial from '@shared/assets/video/novawallet_onboarding_tutorial.mp4';
import novawallet_onboarding_tutorial_webm from '@shared/assets/video/novawallet_onboarding_tutorial.webm';
import { usePrevious } from '@shared/lib/hooks';
import { walletConnectUtils, walletConnectModel } from '@entities/walletConnect';
import { chainsService } from '@shared/api/network';
import { wcOnboardingModel } from '@pages/Onboarding/WalletConnect/model/wc-onboarding-model';
import { NWQRConfig, Step, EXPIRE_TIMEOUT } from './lib/constants';
import { useStatusContext } from '@app/providers/context/StatusContext';
import { WalletType } from '@shared/core';
import { isNeedDisconnect } from './lib/utils';

type Props = {
  isOpen: boolean;
  size?: number;
  onClose: () => void;
  onComplete: () => void;
};

const qrCode = new QRCodeStyling(NWQRConfig);

export const NovaWallet = ({ isOpen, onClose, onComplete }: Props) => {
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
      timeout && clearTimeout(timeout);
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
          <div className="w-[472px] flex flex-col px-5 py-4 bg-white rounded-l-lg">
            <HeaderTitleText className="mb-10">{t('onboarding.novaWallet.title')}</HeaderTitleText>
            <SmallTitleText className="mb-6">{t('onboarding.novaWallet.scanTitle')}</SmallTitleText>

            <div className="flex flex-1 relative items-center justify-center">
              <div className="z-0 absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2">
                <Loader color="primary" />
              </div>

              <div key="nova-wallet" className="z-10" ref={ref}></div>
            </div>

            <div className="flex justify-between items-end">
              <Button variant="text" onClick={handleClose}>
                {t('onboarding.backButton')}
              </Button>
            </div>
          </div>

          <div className="w-[472px] flex flex-col bg-black">
            <video className="object-contain h-full" autoPlay loop>
              <source src={novawallet_onboarding_tutorial_webm} type="video/webm" />
              <source src={novawallet_onboarding_tutorial} type="video/mp4" />
            </video>
          </div>
        </>
      )}

      {step === Step.MANAGE && session && pairingTopic && (
        <ManageStep
          type={WalletType.NOVA_WALLET}
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
