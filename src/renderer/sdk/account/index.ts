import { createSDK } from '@/shared/di';
import { accountService } from '@/domains/network';

export const accountSDK = createSDK({
  required: {
    actionPermission: accountService.accountActionPermissionAnyOf,
    availableOnChain: accountService.accountAvailabilityOnChainAnyOf,
    canSignMultipleTransactions: accountService.accountCanSignMultipleAnyOf,
  },
  optional: {
    collectAccountChildren: accountService.accountCollectChildrenPipeline,
    validateRouteBalances: accountService.validateRouteBalancesTransformer,
    validateCallPermission: accountService.validateCallPermissionTransformer,
  },
});
