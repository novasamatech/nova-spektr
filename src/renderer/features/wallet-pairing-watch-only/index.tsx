import { TEST_IDS } from '@/shared/constants';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { WalletCard } from '@/shared/ui-entities';
import { walletPairingDropdownOptionsPipeline, walletPairingModel } from '@/features/wallet-pairing';
import { onboardingActionsSlot } from '@/pages/Onboarding';

export const walletPairingWatchOnlyFeature = createFeature({
  name: 'wallet pairing/watch only',
});

walletPairingWatchOnlyFeature.inject(onboardingActionsSlot, {
  order: 2,
  render() {
    const { t } = useI18n();

    return (
      <WalletCard
        title={t('onboarding.welcome.watchOnlyTitle')}
        description={t('onboarding.welcome.watchOnlyDescription')}
        iconName="watchOnlyOnboarding"
        testId={TEST_IDS.ONBOARDING.WATCH_ONLY_BUTTON}
        onClick={() => walletPairingModel.events.walletTypeSet(WalletType.WATCH_ONLY)}
      />
    );
  },
});

walletPairingWatchOnlyFeature.inject(walletPairingDropdownOptionsPipeline, (options, { t }) => {
  return options.concat({ title: t('wallets.addWatchOnly'), walletType: WalletType.WATCH_ONLY, order: 4 });
});
