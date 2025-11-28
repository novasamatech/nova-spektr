import { navigationActionsSlot } from '@/features/app-shell';

import { VestedTransferModal } from './components/VestedTransferModal';
import { vestedTransferFeature } from './model/feature';

export { vestedTransferFeature };

vestedTransferFeature.inject(navigationActionsSlot, {
  order: 1001,
  render: () => <VestedTransferModal />,
});
