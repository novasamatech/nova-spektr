import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { customOperationsSlot } from '@/features/app-custom-operations';

import { VestedTransferModal } from './components/VestedTransferModal';

const vestedTransferFeature = createFeature({
  name: 'vested/transfer',
  enable: $features.map(({ vestedTransfer }) => vestedTransfer),
});

vestedTransferFeature.inject(customOperationsSlot, {
  order: 1,
  render: () => <VestedTransferModal />,
});

export { vestedTransferFeature };
