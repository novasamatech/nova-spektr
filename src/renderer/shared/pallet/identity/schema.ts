import { z } from 'zod';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

export type IdentityJudgement = z.infer<typeof identityJudgement>;
export const identityJudgement = pjsSchema.enumValue({
  Unknown: pjsSchema.null,
  FeePaid: pjsSchema.u128,
  Reasonable: pjsSchema.null,
  KnownGood: pjsSchema.null,
  OutOfDate: pjsSchema.null,
  LowQuality: pjsSchema.null,
  Erroneous: pjsSchema.null,
});

export type IdentityLegacyIdentityInfo = z.infer<typeof identityLegacyIdentityInfo>;
export const identityLegacyIdentityInfo = pjsSchema.object({
  display: pjsSchema.dataString,
  legal: pjsSchema.dataString,
  web: pjsSchema.dataString,
  matrix: pjsSchema.dataString,
  email: pjsSchema.dataString,
  pgpFingerprint: pjsSchema.optional(z.unknown()),
  image: pjsSchema.dataString,
  twitter: pjsSchema.dataString,
  github: pjsSchema.dataString,
  discord: pjsSchema.dataString,
});

export type IdentityRegistration = z.infer<typeof identityRegistration>;
export const identityRegistration = pjsSchema.object({
  judgements: pjsSchema.vec(pjsSchema.tupleMap(['index', pjsSchema.u32], ['judgement', identityJudgement])),
  deposit: pjsSchema.u128,
  info: identityLegacyIdentityInfo,
});

export type IdentityRegistrarInfo = z.infer<typeof identityRegistrationInfo>;
export const identityRegistrationInfo = pjsSchema.object({
  account: pjsSchema.accountId,
  fee: pjsSchema.u128,
  fields: pjsSchema.u64,
});
