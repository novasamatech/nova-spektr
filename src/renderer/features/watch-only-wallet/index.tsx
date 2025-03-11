import { createFeature } from '@/shared/feature';
import { Identicon } from '@/shared/ui';
import { WalletIcon, accountUtils, walletUtils } from '@/entities/wallet';
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
  collectAccountChildren(children) {
    return children;
  },
  wrapTransaction(transaction) {
    return transaction;
  },
});

watchOnlyWalletFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (!walletUtils.isWatchOnly(wallet)) return null;

  const address = wallet.accounts[0]?.accountId;

  return (
    <div className="relative">
      <Identicon address={address} size={size} background={false} />
      <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-white">
        <WalletIcon type={wallet.type} size={size / 2} />
      </div>
    </div>
  );
});

watchOnlyWalletFeature.inject(walletGroupSlot, {
  order: 4,
  render: ({ query, onSelect }) => <WatchOnlyGroup query={query} onSelect={onSelect} />,
});
