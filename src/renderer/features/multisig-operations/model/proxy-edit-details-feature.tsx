import { createFeature } from '@/shared/feature';
import { operationDetailsSlot } from '../components/OperationFullInfo';
import { EditControllerOperationDetails } from '../ui/EditControllerOperationDetails';

export const proxyEditDetailsFeature = createFeature({
  name: 'multisig-operations/proxy-edit-details',
});

proxyEditDetailsFeature.inject(operationDetailsSlot, {
  order: 100,
  render: ({ operation }) => <EditControllerOperationDetails operation={operation} />,
});
