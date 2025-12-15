import { customOperationsSlot } from '@/features/app-custom-operations';

import { MultiTransferModal } from './components/MultiTransferModal';
import { multiTransferFeature } from './model/feature';

export { multiTransferFeature };

multiTransferFeature.inject(customOperationsSlot, {
  order: 2,
  render: () => <MultiTransferModal />,
});
