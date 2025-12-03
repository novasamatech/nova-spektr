import { customOperationsSlot } from '@/features/app-custom-operations';

import { VestedTransferModal } from './components/VestedTransferModal';
import { vestedTransferFeature } from './model/feature';

export { vestedTransferFeature };

vestedTransferFeature.inject(customOperationsSlot, {
  order: 2,
  render: () => <VestedTransferModal />,
});
