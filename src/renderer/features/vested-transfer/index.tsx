import { navigationActionsSlot } from '@/features/app-shell';

import { vestedTransferFeature } from './model/feature';
import { VestedTransferNavigation } from './ui/VestedTransferNavigation';

export { vestedTransferFeature };

vestedTransferFeature.inject(navigationActionsSlot, {
  order: 1001,
  render: () => <VestedTransferNavigation />,
});
