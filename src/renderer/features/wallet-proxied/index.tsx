import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { accountsService } from '@/domains/network';
import { WalletIcon, accountUtils, walletUtils } from '@/entities/wallet';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WalletGroup, walletActionsSlot } from './components/WalletGroup';
import { walletsModel } from './model/wallets';

export { walletActionsSlot };

export const walletProxiedFeature = createFeature({
  name: 'wallet/proxied',
  enable: $features.map(f => f.proxy),
});

walletProxiedFeature.inject(accountsService.accountActionPermissionAnyOf, ({ account }) => {
  return accountUtils.isProxiedAccount(account);
});

walletProxiedFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (!walletUtils.isProxied(wallet)) return null;

  return <WalletIcon type={wallet.type} size={size} />;
});

walletProxiedFeature.inject(walletGroupSlot, {
  order: 2,
  render({ query, onSelect }) {
    const { t } = useI18n();
    const wallets = useUnit(walletsModel.$wallets);

    return (
      <WalletGroup
        title={t('wallets.proxiedLabel')}
        walletType={WalletType.PROXIED}
        wallets={wallets}
        query={query}
        onSelect={onSelect}
      />
    );
  },
});
