import { navigationActionsSlot } from '@/features/app-shell';

import { VestedTransferNavigation } from './components/VestedTransferNavigation';
import { vestedTransferFeature } from './model/feature';

export { vestedTransferFeature };

vestedTransferFeature.inject(navigationActionsSlot, {
  order: 1001,
  render: () => <VestedTransferNavigation />,
});
