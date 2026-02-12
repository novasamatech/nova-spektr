import { createFeature } from '@/shared/feature';
import { navigationBottomLinksSlot } from '@/features/app-shell';

import { BackendConfigNavButton } from './ui/BackendConfigNavButton';

export const backendConfigFeature = createFeature({
  name: 'backend/config',
});

backendConfigFeature.inject(navigationBottomLinksSlot, {
  order: 2.5,
  render: () => <BackendConfigNavButton />,
});
