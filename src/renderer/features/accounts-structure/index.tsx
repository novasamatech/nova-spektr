import { $features } from '@/shared/config/features';
import { combineIdentifiers } from '@/shared/di';
import { createFeature } from '@/shared/feature';
import { draftAccountsOverviewSlot } from '@/features/drafts';
import { operationOverviewSlot } from '@/features/multisig-operations';
import {
  flexibleOverviewSlot,
  multisigOverviewSlot,
  proxiedOverviewSlot,
  simpleOverviewSlot,
  vaultOverviewSlot,
  walletConnectOverviewSlot,
  watchOnlyOverviewSlot,
} from '@/features/wallet-details';

import { AccountsStructureModal } from './components/AccountsStructureModal';

export { AccountsStructureModal } from './components/AccountsStructureModal';

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
  watchOnlyOverviewSlot,
  flexibleOverviewSlot,
  operationOverviewSlot,
);

accountsStructureFeature.inject(overviewSlot, ({ walletAccounts, trigger, initialChainId, exclusive }) => {
  return (
    <AccountsStructureModal
      walletAccounts={walletAccounts}
      initialChainId={initialChainId}
      exclusive={exclusive}
      trigger={trigger}
    />
  );
});

accountsStructureFeature.inject(draftAccountsOverviewSlot, ({ walletAccounts, initialChainId, trigger, exclusive }) => {
  return (
    <AccountsStructureModal
      walletAccounts={walletAccounts}
      initialChainId={initialChainId}
      trigger={trigger}
      exclusive={exclusive}
    />
  );
});
