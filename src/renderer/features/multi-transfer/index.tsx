import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { customOperationsSlot } from '@/features/app-custom-operations';

import { MultiTransferModal } from './components/MultiTransferModal';

const multiTransferFeature = createFeature({
  name: 'transfer/multi',
  enable: $features.map(({ multiTransfer }) => multiTransfer),
});

multiTransferFeature.inject(customOperationsSlot, {
  order: 2,
  render: () => <MultiTransferModal />,
});

export { multiTransferFeature };
