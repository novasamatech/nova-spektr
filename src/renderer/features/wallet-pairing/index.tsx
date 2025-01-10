import { createFeature } from '@/shared/effector';
import { walletSelectActionsSlot } from '@/features/wallet-select';

import { WalletPairingSelect, walletPairingDropdownOptionsSlot } from './components/WalletPairingSelect';
import { walletPairingModel } from './model/wallet-pairing-model';

export { walletPairingModel, walletPairingDropdownOptionsSlot };

export const walletPairingFeature = createFeature({
  name: 'wallet pairing/flow',
});

walletPairingFeature.inject(walletSelectActionsSlot, () => {
  return <WalletPairingSelect />;
});
