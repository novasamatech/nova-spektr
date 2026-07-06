import { createSDK } from '@/shared/di';
import {
  operationDetailsSlot,
  operationIconTransformer,
  operationTitleTransformer,
} from '@/features/multisig-operations';

export const multisigOperationsSDK = createSDK({
  required: {
    icon: operationIconTransformer,
    title: operationTitleTransformer,
    details: operationDetailsSlot,
  },
});
