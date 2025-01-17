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
import { walletIcon } from './constants';
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

  return <Icon name={walletIcon[wallet.extension].icon} size={size} />;
});

polkadotExtensionWalletFeature.inject(walletPairingDropdownOptionsSlot, {
  order: 3,
  render({ t }) {
    return (
      <PairingModal extension="polkadot-js">
        <Dropdown.Item>
          <Icon name={walletIcon['polkadot-js'].icon} size={20} />
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
      <PairingModal extension="polkadot-js">
        <WalletOnboardingCard
          title={t('onboarding.welcome.polkadotExtensionTitle')}
          description={t('onboarding.welcome.polkadotExtensionDescription')}
          iconName={walletIcon['polkadot-js'].onboarding}
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
    const polkadot = useUnit(wallets.$polkadot);

    return (
      <WalletGroup
        title={t('wallets.polkadotExtensionLabel')}
        icon={walletIcon['polkadot-js'].icon}
        wallets={polkadot}
        query={query}
        onSelect={onSelect}
      />
    );
  },
});
