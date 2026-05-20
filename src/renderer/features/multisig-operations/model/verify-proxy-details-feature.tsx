import { createFeature } from '@/shared/feature';
import { operationDetailsSlot } from '../components/OperationFullInfo';
import { VerifyProxyOperationDetails } from '../ui/VerifyProxyOperationDetails';

export const verifyProxyDetailsFeature = createFeature({
  name: 'multisig-operations/verify-proxy-details',
});

verifyProxyDetailsFeature.inject(operationDetailsSlot, {
  order: 100,
  render: ({ operation }) => <VerifyProxyOperationDetails operation={operation} />,
});
