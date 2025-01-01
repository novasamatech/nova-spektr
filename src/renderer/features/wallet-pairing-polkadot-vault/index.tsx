import { TEST_IDS } from '@/shared/constants';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { WalletCard } from '@/shared/ui-entities';
import { walletPairingDropdownOptionsPipeline, walletPairingModel } from '@/features/wallet-pairing';
import { onboardingActionsSlot } from '@/pages/Onboarding';

export const walletPairingPolkadotVaultFeature = createFeature({
  name: 'wallet pairing/polkadot vault',
});

walletPairingPolkadotVaultFeature.inject(onboardingActionsSlot, {
  order: 0,
  render() {
    const { t } = useI18n();

    return (
      <WalletCard
        title={t('onboarding.welcome.polkadotVaultTitle')}
        description={t('onboarding.welcome.polkadotVaultDescription')}
        iconName="vaultOnboarding"
        testId={TEST_IDS.ONBOARDING.VAULT_BUTTON}
        onClick={() => walletPairingModel.events.walletTypeSet(WalletType.POLKADOT_VAULT)}
      />
    );
  },
});

walletPairingPolkadotVaultFeature.inject(walletPairingDropdownOptionsPipeline, (options, { t }) => {
  return options.concat({ title: t('wallets.addPolkadotVault'), walletType: WalletType.POLKADOT_VAULT, order: 0 });
});
