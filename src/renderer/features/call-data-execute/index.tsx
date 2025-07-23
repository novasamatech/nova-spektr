import { navigationActionsSlot } from '@/features/app-shell';

import { callDataExecuteFeature } from './model/feature';
import { CallDataSubmit } from './ui/CallDataSubmitModal';

export { callDataExecuteFeature };

callDataExecuteFeature.inject(navigationActionsSlot, {
  order: 1000,
  render: () => <CallDataSubmit />,
});
