import { useUnit } from 'effector-react';

import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { accountsService } from '@/domains/network';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WalletGroup } from './components/WalletGroup';
import { WalletIcon } from './components/WalletIcon';
import { walletWalletConnectFeature } from './model/feature';
import { wcWallets } from './model/wallets';

walletWalletConnectFeature.inject(accountsService.accountActionPermissionAnyOf, ({ account }) => {
  return accountUtils.isWcAccount(account);
});

walletWalletConnectFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (!walletUtils.isWalletConnectGroup(wallet)) return null;

  return <WalletIcon wallet={wallet} size={size} />;
});

walletWalletConnectFeature.inject(walletGroupSlot, {
  order: 1,
  render({ query, onSelect }) {
    const { t } = useI18n();
    const nova = useUnit(wcWallets.$novaWallets);
    const wc = useUnit(wcWallets.$walletConnectWallets);

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

export { walletWalletConnectFeature } from './model/feature';
export { WalletGroup, walletActionsSlot } from './components/WalletGroup';
export { type InitConnectParams, type InitReconnectParams } from './lib/types';
export { DEFAULT_POLKADOT_METHODS } from './lib/constants';
export { walletConnectService } from './lib/service';
export { walletConnect } from './model/connect';
