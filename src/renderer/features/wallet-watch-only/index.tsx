import { createFeature } from '@/shared/feature';
import { WalletIcon, accountUtils, walletUtils } from '@/entities/wallet';
import { accountSDK } from '@/sdk/account';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WatchOnlyGroup, walletActionsSlot } from './components/WatchOnlyGroup';

export { walletActionsSlot };

export const walletWatchOnlyFeature = createFeature({
  name: 'wallet/watch-only',
});

accountSDK(walletWatchOnlyFeature, {
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
  collectAccountChildren(children) {
    return children;
  },
});

walletWatchOnlyFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (!walletUtils.isWatchOnly(wallet)) return null;

  return <WalletIcon type={wallet.type} size={size} />;
});

walletWatchOnlyFeature.inject(walletGroupSlot, {
  order: 4,
  render: ({ query, onSelect }) => <WatchOnlyGroup query={query} onSelect={onSelect} />,
});
