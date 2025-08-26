import { createSDK } from '@/shared/di';
import {
  operationDetailsSlot,
  operationIconTransformer,
  operationLogTitleTransformer,
  operationTitleTransformer,
} from '@/features/multisig-operations';

export const multisigOperationsSDK = createSDK({
  required: {
    icon: operationIconTransformer,
    logTitle: operationLogTitleTransformer,
    title: operationTitleTransformer,
    details: operationDetailsSlot,
  },
});
