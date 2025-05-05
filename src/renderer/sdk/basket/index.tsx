import { createSDK } from '@/shared/di';
import {
  basketTransactionConfirmDetailsSlot,
  basketTransactionConfirmTitleSlot,
  operationTitleSlot,
  validation,
} from '@/features/basket-operations';

export const basketSDK = createSDK({
  required: {
    operationTitle: operationTitleSlot,
    transactionConfirmTitle: basketTransactionConfirmTitleSlot,
    transactionConfirmDetails: basketTransactionConfirmDetailsSlot,
    validation: validation.validationAsyncPipeline,
  },
});
