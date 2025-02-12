import { z } from 'zod';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

export type SupportDispatchPerDispatchClassU32 = z.infer<typeof supportDispatchPerDispatchClassU32>;
export const supportDispatchPerDispatchClassU32 = pjsSchema.object({
  normal: pjsSchema.u32,
  operational: pjsSchema.u32,
  mandatory: pjsSchema.u32,
});

export type SystemLimitsBlockLength = z.infer<typeof systemLimitsBlockLength>;
export const systemLimitsBlockLength = pjsSchema.object({
  max: supportDispatchPerDispatchClassU32,
});

export type SpWeightsWeightV2Weight = z.infer<typeof spWeightsWeightV2Weight>;
const spWeightsWeightV2Weight = pjsSchema.object({
  // Compact<u64>
  refTime: z.unknown(),
  // Compact<u64>
  proofSize: z.unknown(),
});

export type SystemLimitsWeightsPerClass = z.infer<typeof systemLimitsWeightsPerClass>;
const systemLimitsWeightsPerClass = pjsSchema.object({
  baseExtrinsic: spWeightsWeightV2Weight,
  maxExtrinsic: pjsSchema.optional(spWeightsWeightV2Weight),
  maxTotal: pjsSchema.optional(spWeightsWeightV2Weight),
  reserved: pjsSchema.optional(spWeightsWeightV2Weight),
});

export type SupportDispatchPerDispatchClassWeightsPerClass = z.infer<
  typeof supportDispatchPerDispatchClassWeightsPerClass
>;
const supportDispatchPerDispatchClassWeightsPerClass = pjsSchema.object({
  normal: systemLimitsWeightsPerClass,
  operational: systemLimitsWeightsPerClass,
  mandatory: systemLimitsWeightsPerClass,
});

export type SystemLimitsBlockWeights = z.infer<typeof systemLimitsBlockWeights>;
export const systemLimitsBlockWeights = pjsSchema.object({
  baseBlock: spWeightsWeightV2Weight,
  maxBlock: spWeightsWeightV2Weight,
  perClass: supportDispatchPerDispatchClassWeightsPerClass,
});
