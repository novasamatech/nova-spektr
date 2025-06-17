import { createSDK } from '@/shared/di';
import { accountService } from '@/domains/network';
import { accountNodeConfigTransformer } from '@/features/accounts-structure';

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
