import { createSDK, createTransformer } from '@/shared/di';
import { type AnyAccount, accountService } from '@/domains/network';

export const accountNodeConfigTransformer = createTransformer<
  { account: AnyAccount },
  { title: string; color: string }
>();

export const accountConnectionTransformer = createTransformer<
  { source: AnyAccount; target: AnyAccount },
  { label: string; textColor: string; backgroundColor: string }
>();

export const accountSDK = createSDK({
  required: {
    actionPermission: accountService.accountActionPermissionAnyOf,
    availableOnChain: accountService.accountAvailabilityOnChainAnyOf,
    canSignMultipleTransactions: accountService.accountCanSignMultipleAnyOf,
    visualGraphNode: accountNodeConfigTransformer,
  },
  optional: {
    collectAccountChildren: accountService.accountCollectChildrenPipeline,
    connection: accountConnectionTransformer,
  },
});
