import { createFeature } from '@/shared/feature';
import { accountService } from '@/domains/network';
import { WalletIcon, accountUtils, walletUtils } from '@/entities/wallet';
import { walletGroupSlot, walletIconSlot } from '@/features/wallet-select';

import { WatchOnlyGroup, walletActionsSlot } from './components/WatchOnlyGroup';

export { walletActionsSlot };

export const walletWatchOnlyFeature = createFeature({
  name: 'wallet/watch-only',
});

// read only obviously
walletWatchOnlyFeature.inject(accountService.accountActionPermissionAnyOf, ({ account }) => {
  if (accountUtils.isWatchOnlyAccount(account)) {
    return false;
  }
});

// watch-only account can be applied on all supported chains
walletWatchOnlyFeature.inject(accountService.accountAvailabilityOnChainAnyOf, ({ account }) => {
  return accountUtils.isWatchOnlyAccount(account);
});

walletWatchOnlyFeature.inject(walletIconSlot, ({ wallet, size }) => {
  if (!walletUtils.isWatchOnly(wallet)) return null;

  return <WalletIcon type={wallet.type} size={size} />;
});

walletWatchOnlyFeature.inject(walletGroupSlot, {
  order: 4,
  render: ({ query, onSelect }) => <WatchOnlyGroup query={query} onSelect={onSelect} />,
});
