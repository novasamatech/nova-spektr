import { createFeature } from '@/shared/feature';
import { walletSelectActionsSlot } from '@/features/wallet-select';

import { UpdateButton } from './ui/UpdateButton';

export const accountSyncFeature = createFeature({
  name: 'account/sync',
});

accountSyncFeature.inject(walletSelectActionsSlot, {
  order: 0,
  render: () => <UpdateButton />,
});
