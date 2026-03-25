import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { customOperationsSlot } from '@/features/app-custom-operations';

import { CallDataSubmit } from './ui/CallDataSubmitModal';

const callDataExecuteFeature = createFeature({
  name: 'call-data/execute',
  enable: $features.map(({ callData }) => callData),
});

callDataExecuteFeature.inject(customOperationsSlot, {
  order: 0,
  render: () => <CallDataSubmit />,
});

export { callDataExecuteFeature };
