import { $features } from '@/shared/config/features';
import { TEST_IDS } from '@/shared/constants';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { WalletIcon, WalletOnboardingCard } from '@/shared/ui-entities';
import { Dropdown } from '@/shared/ui-kit';
import { walletPairingDropdownOptionsSlot } from '@/features/wallet-pairing';
import { onboardingActionsSlot } from '@/pages/Onboarding';

import { PairingModal } from './components/PairingModal';

export const polkadotVaultWalletPairingFeature = createFeature({
  name: 'polkadot vault/wallet pairing',
  enable: $features.map(f => f.polkadotVault),
});

polkadotVaultWalletPairingFeature.inject(onboardingActionsSlot, {
  order: 0,
  render() {
    const { t } = useI18n();

    return (
      <PairingModal>
        <WalletOnboardingCard
          title={t('onboarding.welcome.polkadotVaultTitle')}
          description={t('onboarding.welcome.polkadotVaultDescription')}
          iconName="vaultOnboarding"
          testId={TEST_IDS.ONBOARDING.VAULT_BUTTON}
        />
      </PairingModal>
    );
  },
});

polkadotVaultWalletPairingFeature.inject(walletPairingDropdownOptionsSlot, {
  order: 0,
  render({ t }) {
    return (
      <PairingModal>
        <Dropdown.Item>
          <WalletIcon type={WalletType.POLKADOT_VAULT} />
          {t('wallets.addPolkadotVault')}
        </Dropdown.Item>
      </PairingModal>
    );
  },
});
