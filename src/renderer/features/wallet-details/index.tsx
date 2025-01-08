import { useState } from 'react';

import { combineIdentifiers } from '@/shared/di';
import { createFeature } from '@/shared/effector';
import { IconButton } from '@/shared/ui';
import { walletActionsSlot as multisigActionsSlot } from '@/features/wallet-multisig';
import { walletActionsSlot as polkadotVaultActionsSlot } from '@/features/wallet-polkadot-vault';
import { walletActionsSlot as proxiedActionsSlot } from '@/features/wallet-proxied';
import { walletActionsSlot as walletConnectActionsSlot } from '@/features/wallet-wallet-connect';
import { walletActionsSlot as watchOnlyActionsSlot } from '@/features/wallet-watch-only';

import { WalletDetails } from './ui/components/WalletDetails';

export { WalletDetails };

/**
 * The reason for the existence of this feature is WalletDetails component
 * implementation. walletDetailsFeature should be absolete and details for each
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
