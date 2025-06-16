import { createSDK } from '@/shared/di';
import { accountNodeConfigTransformer, accountService } from '@/domains/network';

export const accountSDK = createSDK({
  required: {
    actionPermission: accountService.accountActionPermissionAnyOf,
    availableOnChain: accountService.accountAvailabilityOnChainAnyOf,
    canSignMultipleTransactions: accountService.accountCanSignMultipleAnyOf,
    nodeConfig: accountNodeConfigTransformer,
  },
  optional: {
    collectAccountChildren: accountService.accountCollectChildrenPipeline,
  },
});
