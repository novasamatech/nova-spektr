import { useUnit } from 'effector-react';

import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Identicon } from '@/shared/ui';
import { accountSDK } from '@/sdk/account';
import { walletPairingDropdownOptionsSlot } from '@/features/wallet-pairing';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';
import { onboardingActionsSlot } from '@/pages/Onboarding';

import { DropdownOptions } from './components/DropdownOptions';
import { OnboardingCards } from './components/OnboardingCards';
import { WalletGroup, walletActionsSlot } from './components/WalletGroup';
import { walletIcon } from './constants';
import { extensionWalletFeature } from './model/feature';
import { wallets } from './model/wallets';
import { polkadotExtensionService } from './service';
import { type PolkadotExtensionWallet, type SubWalletExtensionWallet, type TalismanExtensionWallet } from './types';

export { extensionWalletFeature, walletActionsSlot, polkadotExtensionService };
export type { PolkadotExtensionWallet, TalismanExtensionWallet, SubWalletExtensionWallet };

accountSDK(extensionWalletFeature, {
  actionPermission({ account }) {
    return polkadotExtensionService.isExtensionAccount(account);
  },
  availableOnChain({ account }) {
    return polkadotExtensionService.isExtensionAccount(account);
  },
  canSignMultipleTransactions() {
    return false;
  },
  collectAccountChildren(children) {
    return children;
  },
});

extensionWalletFeature.inject(walletIconSlot, ({ wallet, accounts, size }) => {
  if (!polkadotExtensionService.isExtensionWallet(wallet)) return null;

  const account = accounts.at(0);
  if (!account) return null;

  return <Identicon address={account.accountId} size={size} />;
});

extensionWalletFeature.inject(walletPairingDropdownOptionsSlot, {
  order: 4,
  render: () => <DropdownOptions />,
});

extensionWalletFeature.inject(onboardingActionsSlot, {
  order: 5,
  render: () => <OnboardingCards />,
});

extensionWalletFeature.inject(walletGroupSlot, {
  order: 0,
  render({ query, onSelect }) {
    const { t } = useI18n();
    const polkadot = useUnit(wallets.$polkadot);
    const talisman = useUnit(wallets.$talisman);
    const subWallet = useUnit(wallets.$subWallet);

    return (
      <>
        <WalletGroup
          title={t('wallets.polkadotExtensionLabel')}
          icon={walletIcon[WalletType.POLKADOT_EXTENSION].icon}
          wallets={polkadot}
          query={query}
          onSelect={onSelect}
        />
        <WalletGroup
          title={t('wallets.talismanExtensionLabel')}
          icon={walletIcon[WalletType.TALISMAN_EXTENSION].icon}
          wallets={talisman}
          query={query}
          onSelect={onSelect}
        />
        <WalletGroup
          title={t('wallets.subWalletExtensionLabel')}
          icon={walletIcon[WalletType.SUBWALLET_EXTENSION].icon}
          wallets={subWallet}
          query={query}
          onSelect={onSelect}
        />
      </>
    );
  },
});
