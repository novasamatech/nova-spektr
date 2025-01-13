import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { accountsService } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';
import { walletGroupSlot } from '@/features/wallet-select';

import { WalletGroup, walletActionsSlot } from './components/WalletGroup';
import { walletsModel } from './model/wallets';

export { walletActionsSlot };

export const walletWalletConnectFeature = createFeature({
  name: 'wallet/wallet connect',
  enable: $features.map(f => f.walletConnect),
});

walletWalletConnectFeature.inject(accountsService.accountActionPermissionAnyOf, ({ account }) => {
  return accountUtils.isWcAccount(account);
});

walletWalletConnectFeature.inject(walletGroupSlot, {
  order: 2,
  render({ query, onSelect }) {
    const { t } = useI18n();
    const nova = useUnit(walletsModel.$novaWallets);
    const wc = useUnit(walletsModel.$walletConnectWallets);

    return (
      <>
        <WalletGroup
          title={t('wallets.novaWalletLabel')}
          walletType={WalletType.NOVA_WALLET}
          wallets={nova}
          query={query}
          onSelect={onSelect}
        />
        <WalletGroup
          title={t('wallets.walletConnectLabel')}
          walletType={WalletType.WALLET_CONNECT}
          wallets={wc}
          query={query}
          onSelect={onSelect}
        />
      </>
    );
  },
});
