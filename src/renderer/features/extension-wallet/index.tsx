import { useUnit } from 'effector-react';

import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { isEthereumAccountId } from '@/shared/lib/utils';
import { type IconTheme, WalletAccountIcon } from '@/shared/ui-entities';
import { accountService } from '@/domains/network';
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

extensionWalletFeature.inject(accountService.accountAvailabilityOnChainAnyOf, ({ account }) => {
  return polkadotExtensionService.isExtensionAccount(account);
});

extensionWalletFeature.inject(accountService.accountActionPermissionAnyOf, ({ account }) => {
  return polkadotExtensionService.isExtensionAccount(account);
});

extensionWalletFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (!polkadotExtensionService.isExtensionWallet(wallet)) return null;

  const address = wallet.accounts[0]?.accountId;
  const isEthereum = isEthereumAccountId(address);
  const theme: IconTheme = isEthereum ? 'ethereum' : 'polkadot';

  return <WalletAccountIcon address={address} type={wallet.type} size={size} theme={theme}></WalletAccountIcon>;
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
