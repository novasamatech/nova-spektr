import { $features } from '@/shared/config/features';
import { TEST_IDS } from '@/shared/constants';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { WalletOnboardingCard } from '@/shared/ui-entities';
import { onboardingActionsSlot } from '@/pages/Onboarding';

/**
 * Ledger pairing feature is not implemented yet, so it's basically an ad on
 * onboarding page.
 */

export const ledgerWalletPairingFeature = createFeature({
  name: 'ledger/wallet pairing',
  enable: $features.map(f => f.multisig),
});

ledgerWalletPairingFeature.inject(onboardingActionsSlot, {
  order: 6,
  render() {
    const { t } = useI18n();

    return (
      <WalletOnboardingCard
        title={t('onboarding.welcome.ledgerTitle')}
        description={t('onboarding.welcome.ledgerDescription')}
        iconName="ledgerOnboarding"
        disabled
        testId={TEST_IDS.ONBOARDING.LEDGER_BUTTON}
      />
    );
  },
});
