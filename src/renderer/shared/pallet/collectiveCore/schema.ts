import { z } from 'zod';

import { papiSchema } from '@/shared/papi-schemas';

export type CollectiveCoreParams = z.infer<typeof collectiveCoreParams>;
export const collectiveCoreParams = z.object({
  active_salary: z.array(papiSchema.bigNumber),
  passive_salary: z.array(papiSchema.bigNumber),
  demotion_period: z.array(papiSchema.blockHeight),
  min_promotion_period: z.array(papiSchema.blockHeight),
  offboard_timeout: papiSchema.blockHeight,
});

export type CollectiveCoreMemberStatus = z.infer<typeof collectiveCoreMemberStatus>;
export const collectiveCoreMemberStatus = z.object({
  is_active: z.boolean(),
  last_promotion: papiSchema.blockHeight,
  last_proof: papiSchema.blockHeight,
});

export type CollectiveCoreMemberEvidence = z.infer<typeof collectiveCoreMemberEvidence>;
export const collectiveCoreMemberEvidence = z
  .tuple([
    z.object({
      type: z.union([z.literal('Retention'), z.literal('Promotion')]),
    }),
    papiSchema.bytesHex,
  ])
  .transform(item => ({ wish: item[0].type, value: item[1] }));
