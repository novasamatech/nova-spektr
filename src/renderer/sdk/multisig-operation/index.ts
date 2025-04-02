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
    additionalInfo: operationAdditionalInfoSlot,
    details: operationDetailsSlot,
  },
  optional: {
    title: operationTitleTransformer,
  },
});
