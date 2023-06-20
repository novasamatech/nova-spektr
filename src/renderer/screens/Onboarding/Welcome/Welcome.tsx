import { useNavigate } from 'react-router-dom';
import { useLayoutEffect, useRef, useState } from 'react';
import { throttle } from 'lodash';

import { Icon } from '@renderer/components/ui';
import { TitleText } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { useToggle } from '@renderer/shared/hooks';
import cnTw from '@renderer/shared/utils/twMerge';
import WatchOnly from '../WatchOnly/WatchOnly';
import Paths from '@renderer/routes/paths';
import Vault from '../Vault/Vault';
import PrivacyPolicy from './PrivacyPolicy';
import { WelcomeCard } from '@renderer/screens/Onboarding/Welcome/WelcomeCard';

const LOGO_WIDTH = 232;
const RIGHT_PADDING = 225;

const Welcome = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [isWatchOnlyModalOpen, toggleWatchOnlyModal] = useToggle();
  const [isVaultModalOpen, toggleVaultModal] = useToggle();

  const logo = useRef<HTMLDivElement>(null);

  // const [windowSize, setWindowSize] = useState<{ width: number, height: number}>();
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
  }, []); // Empty array ensures that effect is only run on mount and unmount

  const handleCreateWatchOnlyWallet = () => {
    toggleWatchOnlyModal();
    navigate(Paths.BALANCES);
  };

  const handleCreateVaultWallet = () => {
    toggleVaultModal();
    navigate(Paths.BALANCES);
  };

  return (
    <div className="flex h-screen w-screen">
      <div className="w-[512px] flex flex-col p-10 h-full">
        <TitleText className="mb-8">{t('onboarding.welcome.title')}</TitleText>

        <div className="flex flex-col gap-4">
          <WelcomeCard
            title={t('onboarding.welcome.polkadotVaultTitle')}
            description={t('onboarding.welcome.polkadotVaultDescription')}
            iconName="vault"
            onClick={toggleVaultModal}
          />

          <WelcomeCard
            title={t('onboarding.welcome.watchOnlyTitle')}
            description={t('onboarding.welcome.watchOnlyDescription')}
            iconName="watchOnlyOnboarding"
            onClick={toggleWatchOnlyModal}
          />

          <WelcomeCard
            title={t('onboarding.welcome.novaWalletTitle')}
            description={t('onboarding.welcome.novaWalletDescription')}
            iconName="novaWallet"
            disabled
          />

          <WelcomeCard
            title={t('onboarding.welcome.ledgerTitle')}
            description={t('onboarding.welcome.ledgerDescription')}
            iconName="ledger"
            disabled
          />

          <WelcomeCard
            title={t('onboarding.welcome.walletConnectTitle')}
            description={t('onboarding.welcome.walletConnectDescription')}
            iconName="walletConnect"
            disabled
          />
        </div>

        <div className="flex-1 flex items-end">
          <PrivacyPolicy />
        </div>
      </div>
      <div
        ref={logo}
        className="relative flex-1 flex flex-col h-full bg-input-background-disabled justify-center items-end logo-background"
      >
        <div className={cnTw('relative w-fit', fixed ? `pr-[225px]` : 'self-center')}>
          <Icon name="logoTitle" className="-scale-y-100" size={LOGO_WIDTH} />
        </div>
      </div>

      <WatchOnly
        isOpen={isWatchOnlyModalOpen}
        onClose={toggleWatchOnlyModal}
        onComplete={handleCreateWatchOnlyWallet}
      />

      <Vault isOpen={isVaultModalOpen} onClose={toggleVaultModal} onComplete={handleCreateVaultWallet} />
    </div>
  );
};

export default Welcome;
