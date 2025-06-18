import { $features } from '@/shared/config/features';
import { combineIdentifiers } from '@/shared/di';
import { createFeature } from '@/shared/feature';
import {
  multisigOverviewSlot,
  proxiedOverviewSlot,
  simpleOverviewSlot,
  vaultOverviewSlot,
  walletConnectOverviewSlot,
} from '@/features/wallet-details';

import { AccountsStructureModal } from './components/AccountsStructureModal';

export const accountsStructureFeature = createFeature({
  name: 'accounts/structure',
  enable: $features.map(({ accountsStructure }) => accountsStructure),
});

const overviewSlot = combineIdentifiers(
  simpleOverviewSlot,
  walletConnectOverviewSlot,
  proxiedOverviewSlot,
  multisigOverviewSlot,
  vaultOverviewSlot,
);

accountsStructureFeature.inject(overviewSlot, ({ walletAccounts }) => {
  return <AccountsStructureModal walletAccounts={walletAccounts} />;
});
