import { type TFunction } from 'i18next';

import { type Wallet } from '@/shared/core';
import { createSDK, createTransformer } from '@/shared/di';
import { type AnyAccount, accountService } from '@/domains/network';

export const accountNodeConfigTransformer = createTransformer<
  { account: AnyAccount; wallet?: Wallet; t: TFunction<'translation'> },
  { title: string; subTitle?: string; color: string; background?: string; disabled?: boolean }
>();

export const accountConnectionTransformer = createTransformer<
  { source: AnyAccount; target: AnyAccount; t: TFunction<'translation'> },
  { labels?: { text: string; color: string; background: string }[]; color?: string }
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
    validateRouteBalances: accountService.validateRouteBalancesTransformer,
    validateCallPermission: accountService.validateCallPermissionTransformer,
  },
});
