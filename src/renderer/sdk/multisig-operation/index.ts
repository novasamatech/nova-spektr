import { createSDK } from '@/shared/di';
import { operationDetailsSlot, operationTitleSlot } from '@/features/multisig-operations';

export const multisigOperationSDK = createSDK({
  title: operationTitleSlot,
  details: operationDetailsSlot,
});
