import { type z } from 'zod';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

export type KitchensinkRuntimeProxyType = z.infer<typeof kitchensinkRuntimeProxyType>;
export const kitchensinkRuntimeProxyType = pjsSchema.enumType(
  'Any',
  'NonTransfer',
  'Governance',
  'Staking',
  // All types below can be absent, need some research
  'Auction',
  'CancelProxy',
  'IdentityJudgement',
  'NominationPools',
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
