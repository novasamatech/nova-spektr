import { $features } from '@/shared/config/features';
import { createSlot } from '@/shared/di';
import { createFeature } from '@/shared/feature';
import { type AnyAccount } from '@/domains/network';

import { AccountsStructureModal } from './components/AccountsStructureModal';

export { accountNodeConfigTransformer } from './components/AccountStructureNode';

export const accountsStructureModalSlot = createSlot<{ walletAccounts: AnyAccount[] }>();

export const accountsStructureFeature = createFeature({
  name: 'accounts/structure',
  enable: $features.map(({ accountsStructure }) => accountsStructure),
});

accountsStructureFeature.inject(accountsStructureModalSlot, ({ walletAccounts }) => {
  return <AccountsStructureModal walletAccounts={walletAccounts} />;
});
