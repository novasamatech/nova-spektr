import { createFeature } from '@/shared/feature';
import { navigationHeaderSlot } from '@/features/app-shell';
import { WalletSelect } from '../components/WalletSelect';

export const walletSelectFeatureStatus = createFeature({
  name: 'wallet/select',
});

walletSelectFeatureStatus.inject(navigationHeaderSlot, {
  render({ folded }) {
    return <WalletSelect folded={folded} />;
  },
});
