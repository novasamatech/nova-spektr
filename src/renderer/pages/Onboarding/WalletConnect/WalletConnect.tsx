import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

import { useI18n, useWalletConnectClient } from '@renderer/app/providers';
import { BaseModal, HeaderTitleText, SmallTitleText } from '@renderer/shared/ui';
import ManageStep from './ManageStep/ManageStep';
import onboarding_tutorial from '@video/onboarding_tutorial.mp4';
import onboarding_tutorial_webm from '@video/onboarding_tutorial.webm';
import { usePrevious } from '@renderer/shared/lib/hooks';

type Props = {
  isOpen: boolean;
  size?: number;
  onClose: () => void;
  onComplete: () => void;
};

const enum Step {
  SCAN,
  MANAGE,
}

const WalletConnect = ({ isOpen, onClose, onComplete }: Props) => {
  const { t } = useI18n();
  const { client, connect, uri, session, pairings, disconnect } = useWalletConnectClient();

  const previousPairings = usePrevious(pairings);

  const [qrCode, setQrCode] = useState<string>('');
  const [step, setStep] = useState<Step>(Step.SCAN);
  const [pairingTopic, setPairingTopic] = useState<string>();

  useEffect(() => {
    if (client && isOpen) {
      connect(undefined, () => setStep(Step.MANAGE));
    }
  }, [client, isOpen]);

  useEffect(() => {
    const newPairing = pairings?.find((p) => !previousPairings?.find((pp) => pp.topic === p.topic));

    if (newPairing) {
      setPairingTopic(newPairing.topic);
    }
  }, [pairings.length]);

  useEffect(() => {
    if (uri) {
      QRCode.toDataURL(uri).then(setQrCode);
    } else {
      setQrCode('');
    }
  }, [uri]);

  return (
    <BaseModal
      closeButton
      isOpen={isOpen}
      contentClass="flex h-full"
      panelClass="w-[944px] h-[576px]"
      onClose={onClose}
    >
      {step === Step.SCAN && qrCode && (
        <>
          <div className="w-[472px] flex flex-col px-5 py-4 bg-white rounded-l-lg">
            <HeaderTitleText className="mb-10">{t('onboarding.walletConnect.title')}</HeaderTitleText>
            <SmallTitleText className="mb-6">{t('onboarding.walletConnect.scanTitle')}</SmallTitleText>

            <div>
              <img className="w-[400px] h-[400px]" src={qrCode} />
            </div>
          </div>

          <div className="w-[472px] flex flex-col bg-black">
            <video className="object-contain h-full" autoPlay loop>
              <source src={onboarding_tutorial_webm} type="video/webm" />
              <source src={onboarding_tutorial} type="video/mp4" />
            </video>
          </div>
        </>
      )}

      {step === Step.MANAGE && session && pairingTopic && (
        <ManageStep
          accounts={session.namespaces.polkadot.accounts}
          pairingTopic={pairingTopic}
          sessionTopic={session.topic}
          onBack={disconnect}
          onComplete={onComplete}
        />
      )}
    </BaseModal>
  );
};

export default WalletConnect;
