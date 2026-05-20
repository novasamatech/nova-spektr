import { walletSelectActionsSlot } from '@/features/wallet-select';

import { hideUnnamedWalletsFeature } from './model/feature';
import { HideUnnamedWalletsButton } from './ui/HideUnnamedWalletsButton';

export { hideUnnamedWalletsFeature };

hideUnnamedWalletsFeature.inject(walletSelectActionsSlot, {
  order: -1,
  render: () => <HideUnnamedWalletsButton />,
});
