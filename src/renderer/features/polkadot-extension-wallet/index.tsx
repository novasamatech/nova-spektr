import { useUnit } from 'effector-react';

import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import { WalletOnboardingCard } from '@/shared/ui-entities';
import { Dropdown } from '@/shared/ui-kit';
import { accountsService } from '@/domains/network';
import { walletPairingDropdownOptionsSlot } from '@/features/wallet-pairing';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';
import { onboardingActionsSlot } from '@/pages/Onboarding';

import { PairingModal } from './components/PairingModal';
import { WalletGroup, walletActionsSlot } from './components/WalletGroup';
import { polkadotExtensionWalletFeature } from './model/feature';
import { wallets } from './model/wallets';
import { polkadotExtensionService } from './service';
import { type PolkadotExtensionWallet } from './types';

export { polkadotExtensionWalletFeature, walletActionsSlot, polkadotExtensionService };
export type { PolkadotExtensionWallet };

polkadotExtensionWalletFeature.inject(accountsService.accountAvailabilityOnChainAnyOf, ({ account }) => {
  return polkadotExtensionService.isPolkadotExtensionAccount(account);
});

polkadotExtensionWalletFeature.inject(accountsService.accountActionPermissionAnyOf, ({ account }) => {
  return polkadotExtensionService.isPolkadotExtensionAccount(account);
});

polkadotExtensionWalletFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (!polkadotExtensionService.isPolkadotExtensionWallet(wallet)) return null;

  return <Icon name="keyCustom" size={size} />;
});

polkadotExtensionWalletFeature.inject(walletPairingDropdownOptionsSlot, {
  order: 3,
  render({ t }) {
    return (
      <PairingModal>
        <Dropdown.Item>
          <Icon name="keyCustom" size={20} />
          {t('wallets.addPolkadotExtension')}
        </Dropdown.Item>
      </PairingModal>
    );
  },
});

polkadotExtensionWalletFeature.inject(onboardingActionsSlot, {
  order: 5,
  render() {
    const { t } = useI18n();

    return (
      <PairingModal>
        <WalletOnboardingCard
          title={t('onboarding.welcome.polkadotExtensionTitle')}
          description={t('onboarding.welcome.polkadotExtensionDescription')}
          iconName="keyCustom"
          testId={TEST_IDS.ONBOARDING.POLKADOT_EXTENSION_BUTTON}
        />
      </PairingModal>
    );
  },
});

polkadotExtensionWalletFeature.inject(walletGroupSlot, {
  order: 0,
  render({ query, onSelect }) {
    const { t } = useI18n();
    const walletsList = useUnit(wallets.$list);

    return (
      <WalletGroup
        title={t('wallets.polkadotExtensionLabel')}
        wallets={walletsList}
        query={query}
        onSelect={onSelect}
      />
    );
  },
});
