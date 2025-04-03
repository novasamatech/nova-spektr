import { createSDK } from '@/shared/di';
import {
  operationAdditionalInfoSlot,
  operationDetailsSlot,
  operationIconNameTransformer,
  operationTitleTransformer,
} from '@/features/multisig-operations';

export const multisigOperationSDK = createSDK({
  required: {
    icon: operationIconNameTransformer,
    details: operationDetailsSlot,
  },
  optional: {
    title: operationTitleTransformer,
    additionalInfo: operationAdditionalInfoSlot,
  },
});
