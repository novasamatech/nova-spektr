import { createFeature } from '@/shared/effector';
import { navigationHeaderSlot } from '@/features/app-shell';
import { WalletSelect } from '../components/WalletSelect';

export const walletSelectFeatureStatus = createFeature({
  name: 'wallet/select',
});

walletSelectFeatureStatus.inject(navigationHeaderSlot, () => {
  return <WalletSelect />;
});
