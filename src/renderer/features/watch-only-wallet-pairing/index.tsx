import { TEST_IDS } from '@/shared/constants';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { WalletIcon, WalletOnboardingCard } from '@/shared/ui-entities';
import { Dropdown } from '@/shared/ui-kit';
import { walletPairingDropdownOptionsSlot } from '@/features/wallet-pairing';
import { onboardingActionsSlot } from '@/pages/Onboarding';

import { PairingFormModal } from './components/PairingFormModal';

export const watchOnlyWalletPairingFeature = createFeature({
  name: 'watch only/wallet pairing',
});

watchOnlyWalletPairingFeature.inject(onboardingActionsSlot, {
  order: 2,
  render() {
    const { t } = useI18n();

    return (
      <PairingFormModal>
        <WalletOnboardingCard
          title={t('onboarding.welcome.watchOnlyTitle')}
          description={t('onboarding.welcome.watchOnlyDescription')}
          iconName="watchOnlyOnboarding"
          testId={TEST_IDS.ONBOARDING.WATCH_ONLY_BUTTON}
        />
      </PairingFormModal>
    );
  },
});

watchOnlyWalletPairingFeature.inject(walletPairingDropdownOptionsSlot, {
  order: 3,
  render({ t }) {
    return (
      <PairingFormModal>
        <Dropdown.Item>
          <WalletIcon type={WalletType.WATCH_ONLY} />
          {t('wallets.addWatchOnly')}
        </Dropdown.Item>
      </PairingFormModal>
    );
  },
});
