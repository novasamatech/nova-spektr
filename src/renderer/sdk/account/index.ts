import { createSDK } from '@/shared/di';
import { accountService, transactionService } from '@/domains/network';

export const accountSDK = createSDK({
  actionPermission: accountService.accountActionPermissionAnyOf,
  availableOnChain: accountService.accountAvailabilityOnChainAnyOf,
  canSignMultipleTransactions: accountService.accountCanSignMultipleAnyOf,
  collectAccountChildren: accountService.accountCollectChildrenPipeline,
  wrapTransaction: transactionService.wrapTransactionPipeline,
});
