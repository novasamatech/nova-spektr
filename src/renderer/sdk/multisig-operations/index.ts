import { createSDK } from '@/shared/di';
import {
  logTitleSlot,
  operationDetailsSlot,
  operationIconTransformer,
  operationTitleSlot,
} from '@/features/multisig-operations';

export const multisigOperationsSDK = createSDK({
  required: {
    icon: operationIconTransformer,
    logTitle: logTitleSlot,
    title: operationTitleSlot,
    details: operationDetailsSlot,
  },
});
