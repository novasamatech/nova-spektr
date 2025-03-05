import { useUnit } from 'effector-react';

import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { accountSDK } from '@/sdk/account';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WalletGroup } from './components/WalletGroup';
import { WalletIcon } from './components/WalletIcon';
import { walletConnectWalletFeature } from './model/feature';
import { wcWallets } from './model/wallets';

accountSDK(walletConnectWalletFeature, {
  actionPermission({ account }) {
    return accountUtils.isWcAccount(account);
  },
  availableOnChain({ account }) {
    // wallet connect account are chain-specific
    return accountUtils.isWcAccount(account);
  },
  canSignMultipleTransactions() {
    return false;
  },
  collectAccountChildren(children) {
    return children;
  },
  wrapTransaction(transaction) {
    return transaction;
  },
});

walletConnectWalletFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (!walletUtils.isWalletConnectGroup(wallet)) return null;

  return <WalletIcon wallet={wallet} size={size} />;
});

walletConnectWalletFeature.inject(walletGroupSlot, {
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

export { walletConnectWalletFeature } from './model/feature';
export { WalletGroup } from './components/WalletGroup';
export { walletActionsSlot } from './components/WalletRow';
export { type InitConnectParams, type InitReconnectParams } from './lib/types';
export { DEFAULT_POLKADOT_METHODS } from './lib/constants';
export { walletConnectService } from './lib/service';
export { walletConnect } from './model/connect';
