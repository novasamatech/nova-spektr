import { createSDK } from '@/shared/di';
import { logTitleSlot, operationDetailsSlot, operationTitleSlot } from '@/features/multisig-operations';

export const multisigOperationsSDK = createSDK({
  required: {
    logTitle: logTitleSlot,
    title: operationTitleSlot,
    details: operationDetailsSlot,
  },
});
