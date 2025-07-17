import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { navigationActionsSlot } from '@/features/app-shell';
import { CallData } from '@/widgets/CallData';

export const callDataExecuteFeature = createFeature({
  name: 'call-data/execute',
  enable: $features.map(({ callData }) => callData),
});

callDataExecuteFeature.inject(navigationActionsSlot, () => {
  return <CallData />;
});
