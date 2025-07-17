import { createFeature } from '@/shared/feature';
import { WalletSelect } from '../components/WalletSelect';

export const walletSelectFeatureStatus = createFeature({
  name: 'wallet/select',
});

// Defer the injection to avoid initialization timing issues
const setupInjection = async () => {
  const { navigationHeaderSlot } = await import('@/features/app-shell');
  walletSelectFeatureStatus.inject(navigationHeaderSlot, () => {
    return <WalletSelect />;
  });
};

setupInjection();
