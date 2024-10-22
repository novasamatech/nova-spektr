import { createStore } from 'effector';

import { createFeature } from '@/shared/effector';
import { navigationHeader } from '@/features/app-shell';
import { SelectWalletPairing, WalletSelect } from '@/features/wallets';

export const walletsSelectFeature = createFeature({
  name: 'Wallets select',
  enable: createStore(true),
});

walletsSelectFeature.inject(navigationHeader, () => {
  return <WalletSelect action={<SelectWalletPairing />} />;
});
