import throttle from 'lodash/throttle';
import { useLayoutEffect, useRef, useState } from 'react';

import { useI18n } from '@/app/providers';
import { WalletType } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { Icon, TitleText } from '@/shared/ui';
import { walletPairingModel } from '@/features/wallets';

import PrivacyPolicy from './PrivacyPolicy';
import { WelcomeCard } from './WelcomeCard';

const LOGO_WIDTH = 232;
const RIGHT_PADDING = 225;

export const Welcome = () => {
  const { t } = useI18n();

  const logo = useRef<HTMLDivElement>(null);
  const [fixed, setFixed] = useState(true);

  useLayoutEffect(() => {
    function handleResize() {
      const width = logo.current?.clientWidth || 0;

      setFixed((width - LOGO_WIDTH) / 2 < RIGHT_PADDING);
    }

    handleResize();
    window.addEventListener('resize', throttle(handleResize, 16));

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="flex h-screen w-full animate-in fade-in">
      <div className="flex h-full w-[512px] flex-col p-10">
        <TitleText className="mb-8">{t('onboarding.welcome.title')}</TitleText>

        {/* TODO: move Cards to WalletPairing feature */}
        <div className="flex flex-col gap-4">
          <WelcomeCard
            title={t('onboarding.welcome.polkadotVaultTitle')}
            description={t('onboarding.welcome.polkadotVaultDescription')}
            iconName="vaultOnboarding"
            onClick={() => walletPairingModel.events.walletTypeSet(WalletType.POLKADOT_VAULT)}
          />

          <WelcomeCard
            title={t('onboarding.welcome.novaWalletTitle')}
            description={t('onboarding.welcome.novaWalletDescription')}
            iconName="novaWalletOnboarding"
            onClick={() => walletPairingModel.events.walletTypeSet(WalletType.NOVA_WALLET)}
          />

          <WelcomeCard
            title={t('onboarding.welcome.walletConnectTitle')}
            description={t('onboarding.welcome.walletConnectDescription')}
            iconName="walletConnectOnboarding"
            onClick={() => walletPairingModel.events.walletTypeSet(WalletType.WALLET_CONNECT)}
          />

          <WelcomeCard
            title={t('onboarding.welcome.watchOnlyTitle')}
            description={t('onboarding.welcome.watchOnlyDescription')}
            iconName="watchOnlyOnboarding"
            onClick={() => walletPairingModel.events.walletTypeSet(WalletType.WATCH_ONLY)}
          />
          <WelcomeCard
            title={t('onboarding.welcome.ledgerTitle')}
            description={t('onboarding.welcome.ledgerDescription')}
            iconName="ledgerOnboarding"
            disabled
          />
        </div>

        <div className="flex flex-1 items-end">
          <PrivacyPolicy />
        </div>
      </div>
      <div
        ref={logo}
        className="logo-background relative flex h-full flex-1 flex-col items-end justify-center bg-input-background-disabled"
      >
        <div className={cnTw('relative w-fit', fixed ? `pr-[225px]` : 'self-center')}>
          <Icon name="logoTitle" className="-scale-y-100" size={LOGO_WIDTH} />
        </div>
      </div>
    </div>
  );
};
