import { createSDK } from '@/shared/di';
import { accountService } from '@/domains/network';

export const accountSDK = createSDK({
  required: {
    actionPermission: accountService.accountActionPermissionAnyOf,
    availableOnChain: accountService.accountAvailabilityOnChainAnyOf,
    canSignMultipleTransactions: accountService.accountCanSignMultipleAnyOf,
    collectAccountChildren: accountService.accountCollectChildrenPipeline,
  },
});
