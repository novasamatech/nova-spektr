import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { navigationCustomOperationsSlot } from '@/features/app-shell';

import { CustomOperations } from './ui/CustomOperations';

const appCustomOperationsFeature = createFeature({
  name: 'app/custom-operations',
  enable: $features.map(({ appCustomOperations }) => appCustomOperations),
});

appCustomOperationsFeature.inject(navigationCustomOperationsSlot, {
  order: 0,
  render: () => <CustomOperations />,
});

export { appCustomOperationsFeature };
