import { createSDK } from '@/shared/di';
import { multisigOperationService } from '@/domains/network';
import {
  operationDetailsSlot,
  operationIconTransformer,
  operationLogTitleTransformer,
} from '@/features/multisig-operations';

export const multisigOperationsSDK = createSDK({
  required: {
    icon: operationIconTransformer,
    logTitle: operationLogTitleTransformer,
    title: multisigOperationService.operationTitleTransformer,
    details: operationDetailsSlot,
  },
});
