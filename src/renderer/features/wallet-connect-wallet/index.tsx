import { useUnit } from 'effector-react';

import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { isPolkadotChain } from '@/shared/lib/utils';
import { WalletAccountIcon } from '@/shared/ui-entities';
import { accountService, accounts } from '@/domains/network';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { accountSDK } from '@/sdk/account';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WalletGroup } from './components/WalletGroup';
import { walletConnectWalletFeature } from './model/feature';
import { wcWallets } from './model/wallets';

accountSDK(walletConnectWalletFeature, {
  actionPermission({ account }) {
    return accountUtils.isWcAccount(account);
  },
  availableOnChain({ account, chain }) {
    return accountUtils.isWcAccount(account) && account.chainId === chain.chainId;
  },
  canSignMultipleTransactions() {
    return false;
  },
  visualGraphNode({ account, wallet }) {
    if (accountUtils.isWcAccount(account)) {
      if (walletUtils.isNovaWallet(wallet)) {
        return {
          title: 'Nova Wallet',
          color: '#305CE7',
          background: 'linear-gradient(180deg, #225FE7 50%, #D7D3E9 80%)',
        };
      }

      return {
        title: 'WalletConnect',
        color: '#3B99FC',
      };
    }
  },
});

walletConnectWalletFeature.inject(walletIconSlot, ({ wallet, size }) => {
  const accountList = useUnit(accounts.$list);

  if (!walletUtils.isWalletConnectGroup(wallet)) return null;

  const walletAccounts = accountService.filterAccountsByWallet(accountList, wallet.id);
  const mainAccount =
    walletAccounts.find(account => accountService.isChainAccount(account) && isPolkadotChain(account.chainId)) ||
    walletAccounts.at(0);
  const address = mainAccount?.accountId;

  return <WalletAccountIcon address={address} type={wallet.type} size={size} />;
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
