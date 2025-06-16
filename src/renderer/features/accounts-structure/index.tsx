import { createSlot } from '@/shared/di';
import { createFeature } from '@/shared/feature';
import { type AnyAccount } from '@/domains/network';

import { AccountsStructureModal } from './ui/AccountsStructureModal';

export const accountsStructureModalSlot = createSlot<{ walletAccounts: AnyAccount[] }>();

export const accountsStructureFeature = createFeature({
  name: 'accounts/structure',
});

accountsStructureFeature.inject(accountsStructureModalSlot, ({ walletAccounts }) => {
  return <AccountsStructureModal walletAccounts={walletAccounts} />;
});
