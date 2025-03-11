import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { Icon, Identicon } from '@/shared/ui';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { accountSDK } from '@/sdk/account';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WalletGroup } from './components/WalletGroup';
import { walletActionsSlot } from './components/WalletRow';
import { walletsModel } from './model/wallets';

export { walletActionsSlot };

export const proxiedWalletFeature = createFeature({
  name: 'wallet/proxied',
  enable: $features.map(f => f.proxy),
});

accountSDK(proxiedWalletFeature, {
  actionPermission({ account }) {
    return accountUtils.isProxiedAccount(account);
  },
  availableOnChain({ account }) {
    return accountUtils.isProxiedAccount(account);
  },
  canSignMultipleTransactions() {
    return false;
  },
  collectAccountChildren(children, { account, accounts }) {
    if (accountUtils.isProxiedAccount(account)) {
      return accounts.filter(a => a.accountId === account.proxyAccountId).concat(children);
    }
    return children;
  },
  wrapTransaction(transaction) {
    // TODO implement
    return transaction;
  },
});

proxiedWalletFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (walletUtils.isProxied(wallet)) {
    return (
      <div className="relative">
        <Identicon address={wallet.accounts[0].accountId} size={size} background={false} />
        <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-white">
          <Icon name="proxiedBackground" size={size / 2} />
        </div>
      </div>
    );
  }
  return null;
});

proxiedWalletFeature.inject(walletGroupSlot, {
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
