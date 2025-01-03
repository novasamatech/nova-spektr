import { createFeature } from '@/shared/effector';
import { accountsService } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';
import { walletGroupSlot } from '@/features/wallet-select';

import { WatchOnlyGroup } from './components/WatchOnlyGroup';

export const walletWatchOnlyFeature = createFeature({
  name: 'wallet/watch-only',
});

// read only obviously
walletWatchOnlyFeature.inject(accountsService.accountActionPermissionAnyOf, ({ account }) => {
  if (accountUtils.isWatchOnlyAccount(account)) {
    return false;
  }
});

// watch-only account can be applied on all supported chains
walletWatchOnlyFeature.inject(accountsService.accountAvailabilityOnChainAnyOf, ({ account }) => {
  return accountUtils.isWatchOnlyAccount(account);
});

walletWatchOnlyFeature.inject(walletGroupSlot, ({ query, onSelect, onDetailsRequest }) => (
  <WatchOnlyGroup query={query} onSelect={onSelect} onDetailsRequest={onDetailsRequest} />
));
