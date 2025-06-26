import { createSDK, createTransformer } from '@/shared/di';
import { type AnyAccount, accountService } from '@/domains/network';

export const accountNodeConfigTransformer = createTransformer<
  { account: AnyAccount },
  { title: string; color: string; disabled?: boolean }
>();

export const accountConnectionTransformer = createTransformer<
  { source: AnyAccount; target: AnyAccount },
  { label?: { text: string; color: string; background: string }; color?: string }
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
