import { $features } from '@/shared/config/features';
import { combineIdentifiers } from '@/shared/di';
import { createFeature } from '@/shared/feature';
import {
  multisigAccountsStructureSlot,
  proxiedAccountsStructureSlot,
  simpleAccountsStructureSlot,
  vaultStructureSlot,
  walletConnectAccountsStructureSlot,
} from '@/features/wallet-details';

import { AccountsStructureModal } from './components/AccountsStructureModal';

export const accountsStructureFeature = createFeature({
  name: 'accounts/structure',
  enable: $features.map(({ accountsStructure }) => accountsStructure),
});

const accountsStructureModalSlot = combineIdentifiers(
  simpleAccountsStructureSlot,
  walletConnectAccountsStructureSlot,
  proxiedAccountsStructureSlot,
  multisigAccountsStructureSlot,
  vaultStructureSlot,
);

accountsStructureFeature.inject(accountsStructureModalSlot, ({ walletAccounts }) => {
  return <AccountsStructureModal walletAccounts={walletAccounts} />;
});
