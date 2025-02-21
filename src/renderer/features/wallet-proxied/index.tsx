import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { WalletType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { accountService } from '@/domains/network';
import { WalletIcon, accountUtils, walletUtils } from '@/entities/wallet';
import { accountSDK } from '@/sdk/account';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WalletGroup } from './components/WalletGroup';
import { walletActionsSlot } from './components/WalletRow';
import { walletsModel } from './model/wallets';

export { walletActionsSlot };

export const walletProxiedFeature = createFeature({
  name: 'wallet/proxied',
  enable: $features.map(f => f.proxy),
});

accountSDK(walletProxiedFeature, {
  actionPermission({ account }) {
    return accountUtils.isProxiedAccount(account);
  },
  availableOnChain({ account }) {
    return accountUtils.isProxiedAccount(account);
  },
  canSignMultipleTransactions() {
    return false;
  },
  collectGraphNode(node, { accounts }) {
    const { account } = node;
    if (accountUtils.isProxiedAccount(account)) {
      const proxy = accounts.find(a => a.accountId === account.proxyAccountId);

      if (proxy) {
        return {
          account,
          children: [accountService.accountGraphCollectPipeline({ account: proxy, children: [] }, { accounts })],
        };
      }
    }

    return node;
  },
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
