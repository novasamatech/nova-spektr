import { createFeature } from '@/shared/feature';
import { walletSelectActionsSlot } from '@/features/wallet-select';

import { WalletPairingSelect, walletPairingDropdownOptionsSlot } from './components/WalletPairingSelect';

export { walletPairingDropdownOptionsSlot };

export const walletPairingFeature = createFeature({
  name: 'wallet pairing/flow',
});

walletPairingFeature.inject(walletSelectActionsSlot, {
  order: 1,
  render: () => <WalletPairingSelect />,
});
