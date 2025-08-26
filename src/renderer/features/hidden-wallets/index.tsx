import { generalActionsSlot } from '@/pages/Settings/Overview/components';

import { hiddenWalletsFeature } from './model/feature';
import { HiddenWalletsModal } from './ui/HiddenWalletsModal';

export { HiddenWalletsModal } from './ui/HiddenWalletsModal';
export { hiddenWalletsFeature };

hiddenWalletsFeature.inject(generalActionsSlot, {
  order: 0,
  render: () => <HiddenWalletsModal />,
});
