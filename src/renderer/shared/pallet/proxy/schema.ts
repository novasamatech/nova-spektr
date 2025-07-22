import { type z } from 'zod';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

export type KitchensinkRuntimeProxyType = z.infer<typeof kitchensinkRuntimeProxyType>;
export const kitchensinkRuntimeProxyType = pjsSchema.enumTypeLoose(
  'Any',
  'NonTransfer',
  'NonCritical',
  'NonFungibile',
  'Governance',
  'Fellowship',
  'Staking',
  'Identity',
  'IdentityJudgement',
  'OldIdentityJudgement',
  'Society',
  'Senate',
  'Triumvirate',
  'Transfer',
  'Assets',
  'AssetOwner',
  'AssetManager',
  'Collator',
  'Nomination',
  'NominationPools',
  'Auction',
  'OldAuction',
  'CancelProxy',
  'Registration',
  'SudoBalances',
  'Balances',
  'AuthorMapping',
  'Spokesperson',
  'ChildKeys',
  'RootWeights',
  'SudoUncheckedSetCode',
  'Owner',
  'ParaRegistration',
  'OldAuction',
  'OldIdentityJudgement',
  'OldParaRegistration',
  'OldSudoBalances',
  'Broker',
  'SwapHotkey',
  'LiquidityMining',
);

export type ProxyProxyDefinition = z.infer<typeof proxyProxyDefinition>;
export const proxyProxyDefinition = pjsSchema.object({
  delegate: pjsSchema.accountId,
  delay: pjsSchema.blockHeight,
  proxyType: kitchensinkRuntimeProxyType,
});

export type ProxyAnnouncement = z.infer<typeof proxyAnnouncement>;
export const proxyAnnouncement = pjsSchema.object({
  real: pjsSchema.accountId,
  callHash: pjsSchema.hex,
  height: pjsSchema.blockHeight,
});
