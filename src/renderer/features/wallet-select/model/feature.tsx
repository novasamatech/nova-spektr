import { createFeature } from '@/shared/effector';
import { navigationHeaderSlot } from '@/features/app-shell';
import { SelectWalletPairing } from '@/features/wallets/SelectWalletPairing';
import { WalletSelect } from '../components/WalletSelect';

export const walletsSelectFeatureStatus = createFeature({
  name: 'Wallets select',
});

walletsSelectFeatureStatus.inject(navigationHeaderSlot, () => {
  return <WalletSelect action={<SelectWalletPairing />} />;
});
