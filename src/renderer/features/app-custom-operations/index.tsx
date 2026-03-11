import { navigationCustomOperationsSlot } from '@/features/app-shell';

import { appCustomOperationsFeature } from './model/feature';
import { CustomOperations } from './ui/CustomOperations';

export { customOperationsSlot } from './ui/CustomOperations';
export { appCustomOperationsFeature };

appCustomOperationsFeature.inject(navigationCustomOperationsSlot, {
  order: 0,
  render: ({ folded }) => <CustomOperations folded={folded} />,
});
