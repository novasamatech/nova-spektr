import { TEST_IDS } from '@/shared/constants';
import { createFeature } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { WalletOnboardingCard } from '@/shared/ui-entities';
import { onboardingActionsSlot } from '@/pages/Onboarding';

/**
 * Ledger pairing feature is not implemented yet, so it's basically an ad on
 * onboarding page.
 */

export const walletPairingLedgerFeature = createFeature({
  name: 'wallet pairing/ledger',
});

walletPairingLedgerFeature.inject(onboardingActionsSlot, {
  order: 10,
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
