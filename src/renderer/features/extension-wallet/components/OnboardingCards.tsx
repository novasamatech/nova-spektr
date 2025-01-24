import { useUnit } from 'effector-react';

import { TEST_IDS } from '@/shared/constants';
import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { WalletOnboardingCard } from '@/shared/ui-entities';
import { walletIcon } from '../constants';
import { wallets } from '../model/wallets';

import { PairingModal } from './PairingModal';

export const OnboardingCards = () => {
  const { t } = useI18n();
  const polkadotjsExtension = useUnit(wallets.$polkadotJsExtensionWallet);
  const talismanExtension = useUnit(wallets.$talismanExtensionWallet);
  const subWalletExtension = useUnit(wallets.$subWalletExtensionWallet);

  return (
    <>
      <PairingModal extension="polkadot-js" title={t('onboarding.extension.polkadotJsTitle')}>
        <WalletOnboardingCard
          beta={nonNullable(polkadotjsExtension)}
          disabled={nullable(polkadotjsExtension)}
          notInstalled={nullable(polkadotjsExtension)}
          title={t('onboarding.welcome.polkadotExtensionTitle')}
          description={t('onboarding.welcome.polkadotExtensionDescription')}
          iconName={walletIcon[WalletType.POLKADOT_EXTENSION].onboarding}
          testId={TEST_IDS.ONBOARDING.POLKADOT_EXTENSION_BUTTON}
        />
      </PairingModal>
      <PairingModal extension="talisman" title={t('onboarding.extension.talismanTitle')}>
        <WalletOnboardingCard
          beta={nonNullable(talismanExtension)}
          disabled={nullable(talismanExtension)}
          notInstalled={nullable(talismanExtension)}
          title={t('onboarding.welcome.talismanTitle')}
          description={t('onboarding.welcome.talismanDescription')}
          iconName={walletIcon[WalletType.TALISMAN_EXTENSION].onboarding}
          testId={TEST_IDS.ONBOARDING.TALISMAN_BUTTON}
        />
      </PairingModal>
      <PairingModal extension="subwallet-js" title={t('onboarding.extension.subWalletTitle')}>
        <WalletOnboardingCard
          beta={nonNullable(subWalletExtension)}
          disabled={nullable(subWalletExtension)}
          notInstalled={nullable(subWalletExtension)}
          title={t('onboarding.welcome.subWalletTitle')}
          description={t('onboarding.welcome.subWalletDescription')}
          iconName={walletIcon[WalletType.SUBWALLET_EXTENSION].onboarding}
          testId={TEST_IDS.ONBOARDING.SUBWALLET_BUTTON}
        />
      </PairingModal>
    </>
  );
};
