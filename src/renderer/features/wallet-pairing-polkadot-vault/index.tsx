import { TEST_IDS } from '@/shared/constants';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { WalletOnboardingCard } from '@/shared/ui-entities';
import { Dropdown } from '@/shared/ui-kit';
import { WalletIcon } from '@/entities/wallet';
import { walletPairingDropdownOptionsSlot, walletPairingModel } from '@/features/wallet-pairing';
import { onboardingActionsSlot } from '@/pages/Onboarding';

export const walletPairingPolkadotVaultFeature = createFeature({
  name: 'wallet pairing/polkadot vault',
});

walletPairingPolkadotVaultFeature.inject(onboardingActionsSlot, {
  order: 0,
  render() {
    const { t } = useI18n();

    return (
      <WalletOnboardingCard
        title={t('onboarding.welcome.polkadotVaultTitle')}
        description={t('onboarding.welcome.polkadotVaultDescription')}
        iconName="vaultOnboarding"
        testId={TEST_IDS.ONBOARDING.VAULT_BUTTON}
        onClick={() => walletPairingModel.events.walletTypeSet(WalletType.POLKADOT_VAULT)}
      />
    );
  },
});

walletPairingPolkadotVaultFeature.inject(walletPairingDropdownOptionsSlot, {
  order: 0,
  render({ t }) {
    return (
      <Dropdown.Item onSelect={() => walletPairingModel.events.walletTypeSet(WalletType.POLKADOT_VAULT)}>
        <WalletIcon type={WalletType.POLKADOT_VAULT} />
        {t('wallets.addPolkadotVault')}
      </Dropdown.Item>
    );
  },
});
