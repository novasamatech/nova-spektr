import { createFeature } from '@/shared/feature';
import { toAddress } from '@/shared/lib/utils';
import { WalletAccountIcon } from '@/shared/ui-entities';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { accountSDK } from '@/sdk/account';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WatchOnlyGroup, walletActionsSlot } from './components/WatchOnlyGroup';

export { walletActionsSlot };

export const watchOnlyWalletFeature = createFeature({
  name: 'wallet/watch-only',
});

accountSDK(watchOnlyWalletFeature, {
  // read only, obviously
  actionPermission({ account }) {
    if (accountUtils.isWatchOnlyAccount(account)) {
      return false;
    }
  },
  // watch-only account can be applied on all supported chains
  availableOnChain({ account }) {
    return accountUtils.isWatchOnlyAccount(account);
  },
  canSignMultipleTransactions() {
    return false;
  },
  visualGraphNode({ account }) {
    if (accountUtils.isWatchOnlyAccount(account)) {
      return {
        title: 'Watch Only',
        color: 'var(--badge-orange-background-default)',
      };
    }
  },
});

watchOnlyWalletFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (!walletUtils.isWatchOnly(wallet)) return null;

  const accountId = wallet.accounts[0]?.accountId;

  return <WalletAccountIcon address={toAddress(accountId ?? '')} type={wallet.type} size={size} />;
});

watchOnlyWalletFeature.inject(walletGroupSlot, {
  order: 4,
  render: ({ query, onSelect }) => <WatchOnlyGroup query={query} onSelect={onSelect} />,
});
