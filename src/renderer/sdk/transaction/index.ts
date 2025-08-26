import { createSDK } from '@/shared/di';
import { transactionService } from '@/domains/network';

export const transactionSDK = createSDK({
  required: {
    encode: transactionService.encodeTransactionTransformer,
    decode: transactionService.decodeTransactionTransformer,
    wrap: transactionService.wrapTransactionTransformer,
    unwrap: transactionService.unwrapTransactionTransformer,
  },
  optional: {
    wrapLegacy: transactionService.wrapLegacyTransactionTransformer,
  },
});
