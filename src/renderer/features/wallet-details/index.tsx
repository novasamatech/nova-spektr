import { useState } from 'react';

import { combineIdentifiers } from '@/shared/di';
import { createFeature } from '@/shared/effector';
import { IconButton } from '@/shared/ui';
import { walletActionsSlot as walletConnectActionsSlot } from '@/features/wallet-wallet-connect';
import { walletActionsSlot as watchOnlyActionsSlot } from '@/features/wallet-watch-only';

import { WalletDetails } from './ui/components/WalletDetails';

// should be totally internal
export { WalletDetails };

export const walletDetailsFeature = createFeature({
  name: 'wallet/details',
});

const walletActionSlot = combineIdentifiers(walletConnectActionsSlot, watchOnlyActionsSlot);

walletDetailsFeature.inject(walletActionSlot, ({ wallet }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton name="details" onClick={() => setOpen(true)} />
      <WalletDetails wallet={wallet} isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
});
