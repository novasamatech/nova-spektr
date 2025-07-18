import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { navigationActionsSlot } from '@/features/app-shell';

import { CallDataSubmit } from './ui/CallDataSubmitModal';

export const callDataExecuteFeature = createFeature({
  name: 'call-data/execute',
  enable: $features.map(({ callData }) => callData),
});

callDataExecuteFeature.inject(navigationActionsSlot, {
  order: 1000,
  render: () => <CallDataSubmit />,
});
