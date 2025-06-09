import { createSDK } from '@/shared/di';
import {
  logTitleSlot,
  operationDetailsSlot,
  operationIconTransformer,
  operationTitleTransformer,
} from '@/features/multisig-operations';

export const multisigOperationsSDK = createSDK({
  required: {
    icon: operationIconTransformer,
    logTitle: logTitleSlot,
    title: operationTitleTransformer,
    details: operationDetailsSlot,
  },
});
