import { useState } from 'react';

import { combineIdentifiers } from '@/shared/di';
import { createFeature } from '@/shared/feature';
import { IconButton } from '@/shared/ui';
import { walletActionsSlot as extensionActionsSlot } from '@/features/extension-wallet';

import { WalletDetails } from './ui/components';

import { walletActionsSlot as multisigActionsSlot } from 'src/renderer/features/multisig-wallet';
import { walletActionsSlot as polkadotVaultActionsSlot } from 'src/renderer/features/polkadot-vault-wallet';
import { walletActionsSlot as proxiedActionsSlot } from 'src/renderer/features/proxied-wallet';
import { walletActionsSlot as walletConnectActionsSlot } from 'src/renderer/features/wallet-connect-wallet';
import { walletActionsSlot as watchOnlyActionsSlot } from 'src/renderer/features/watch-only-wallet';

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
