import { createFeature } from '@/shared/effector';
import { walletSelectActionsSlot } from '@/features/wallet-select';

import { WalletPairingSelect } from './components/WalletPairingSelect';

export { walletPairingModel } from './model/wallet-pairing-model';
export { walletPairingDropdownOptionsSlot } from './components/WalletPairingSelect';

export const walletPairingFeature = createFeature({
  name: 'wallet-pairing/flow',
});

walletPairingFeature.inject(walletSelectActionsSlot, () => {
  return <WalletPairingSelect />;
});
