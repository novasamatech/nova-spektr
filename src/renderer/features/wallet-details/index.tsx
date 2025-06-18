import { useState } from 'react';

import { combineIdentifiers } from '@/shared/di';
import { createFeature } from '@/shared/feature';
import { IconButton } from '@/shared/ui';
import { walletActionsSlot as extensionActionsSlot } from '@/features/extension-wallet';
import { walletActionsSlot as multisigActionsSlot } from '@/features/multisig-wallet';
import { walletActionsSlot as polkadotVaultActionsSlot } from '@/features/polkadot-vault-wallet';
import { walletActionsSlot as proxiedActionsSlot } from '@/features/proxied-wallet';
import { walletActionsSlot as walletConnectActionsSlot } from '@/features/wallet-connect-wallet';
import { walletActionsSlot as watchOnlyActionsSlot } from '@/features/watch-only-wallet';

import { WalletDetails } from './ui/components';

export { accountsStructureSlot as simpleAccountsStructureSlot } from './ui/wallets/SimpleWalletDetails';
export { accountsStructureSlot as vaultStructureSlot } from './ui/wallets/VaultWalletDetails';
export { accountsStructureSlot as multisigAccountsStructureSlot } from './ui/wallets/MultisigWalletDetails';
export { accountsStructureSlot as proxiedAccountsStructureSlot } from './ui/wallets/ProxiedWalletDetails';
export { accountsStructureSlot as walletConnectAccountsStructureSlot } from './ui/wallets/WalletConnectDetails';

export { WalletDetails };

/**
 * The reason for the existence of this feature is WalletDetails component
 * implementation. walletDetailsFeature should be obsolete and details for each
 * type of wallet should be coupled with wallet implementation.
 */

export const walletDetailsFeature = createFeature({
  name: 'wallet/details',
});

const walletActionSlot = combineIdentifiers(
  walletConnectActionsSlot,
  watchOnlyActionsSlot,
  polkadotVaultActionsSlot,
  proxiedActionsSlot,
  multisigActionsSlot,
  extensionActionsSlot,
);

walletDetailsFeature.inject(walletActionSlot, ({ wallet }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton name="details" onClick={() => setOpen(true)} />
      <WalletDetails wallet={wallet} isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
});
