import { customOperationsSlot } from '@/features/app-custom-operations';

import { callDataExecuteFeature } from './model/feature';
import { CallDataSubmit } from './ui/CallDataSubmitModal';

export { callDataExecuteFeature };

callDataExecuteFeature.inject(customOperationsSlot, {
  order: 0,
  render: () => <CallDataSubmit />,
});
