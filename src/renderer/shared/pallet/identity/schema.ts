import { z } from 'zod';

import { pjsSchema } from '../../polkadotjs-schemas';

export type IdentityJudgement = z.infer<typeof identityJudgement>;
export const identityJudgement = pjsSchema.enumValue({
  Unknown: pjsSchema.bool,
  FeePaid: pjsSchema.u128,
  Reasonable: pjsSchema.bool,
  KnownGood: pjsSchema.bool,
  OutOfDate: pjsSchema.bool,
  LowQuality: pjsSchema.bool,
  Erroneous: pjsSchema.bool,
});

export type IdentityLegacyIdentityInfo = z.infer<typeof identityLegacyIdentityInfo>;
export const identityLegacyIdentityInfo = pjsSchema.object({
  display: pjsSchema.dataString,
  legal: pjsSchema.dataString,
  web: pjsSchema.optional(pjsSchema.dataString),
  riot: pjsSchema.optional(pjsSchema.dataString),
  matrix: pjsSchema.optional(pjsSchema.dataString),
  email: pjsSchema.dataString,
  pgpFingerprint: pjsSchema.optional(z.unknown()),
  image: pjsSchema.optional(pjsSchema.dataString),
  twitter: pjsSchema.optional(pjsSchema.dataString),
  github: pjsSchema.optional(pjsSchema.dataString),
  discord: pjsSchema.optional(pjsSchema.dataString),
});

export type IdentityRegistration = z.infer<typeof identityRegistration>;
export const identityRegistration = pjsSchema.object({
  judgements: pjsSchema.vec(pjsSchema.tupleMap(['account', pjsSchema.accountId], ['judgement', identityJudgement])),
  deposit: pjsSchema.u128,
  info: identityLegacyIdentityInfo,
});

export type IdentityRegistrarInfo = z.infer<typeof identityRegistrationInfo>;
export const identityRegistrationInfo = pjsSchema.object({
  account: pjsSchema.accountId,
  fee: pjsSchema.u128,
  fields: pjsSchema.u64,
});
