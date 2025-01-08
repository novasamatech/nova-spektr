import { $features } from '@/shared/config/features';
import { TEST_IDS } from '@/shared/constants';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { WalletOnboardingCard } from '@/shared/ui-entities';
import { Dropdown } from '@/shared/ui-kit';
import { WalletIcon } from '@/entities/wallet';
import { walletPairingDropdownOptionsSlot } from '@/features/wallet-pairing';
import { onboardingActionsSlot } from '@/pages/Onboarding';

import { PairingModal } from './components/PairingModal';

// TODO this component should be injected, not exported
export { WalletConnectQrCode } from './components/WalletConnectQrCode';

// TODO implement

export const walletPairingWalletConnectFeature = createFeature({
  name: 'wallet pairing/wallet connect',
  enable: $features.map(f => f.walletConnect),
});

walletPairingWalletConnectFeature.inject(onboardingActionsSlot, {
  order: 1,
  render() {
    const { t } = useI18n();

    // nova wallet pairing is basically the same, let's keep it here for now
    return (
      <>
        <PairingModal variant="novawallet">
          <WalletOnboardingCard
            title={t('onboarding.welcome.novaWalletTitle')}
            description={t('onboarding.welcome.novaWalletDescription')}
            iconName="novaWalletOnboarding"
            testId={TEST_IDS.ONBOARDING.NOVA_WALLET_BUTTON}
          />
        </PairingModal>

        <PairingModal variant="walletconnect">
          <WalletOnboardingCard
            title={t('onboarding.welcome.walletConnectTitle')}
            description={t('onboarding.welcome.walletConnectDescription')}
            iconName="walletConnectOnboarding"
            testId={TEST_IDS.ONBOARDING.WALLET_CONNECT_BUTTON}
          />
        </PairingModal>
      </>
    );
  },
});

walletPairingWalletConnectFeature.inject(walletPairingDropdownOptionsSlot, {
  order: 1,
  render({ t }) {
    // nova wallet pairing is basically the same, let's keep it here for now
    return (
      <>
        <PairingModal variant="novawallet">
          <Dropdown.Item>
            <WalletIcon type={WalletType.NOVA_WALLET} />
            {t('wallets.addNovaWallet')}
          </Dropdown.Item>
        </PairingModal>
        <PairingModal variant="walletconnect">
          <Dropdown.Item>
            <WalletIcon type={WalletType.WALLET_CONNECT} />
            {t('wallets.addWalletConnect')}
          </Dropdown.Item>
        </PairingModal>
      </>
    );
  },
});
