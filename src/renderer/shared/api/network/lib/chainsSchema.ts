import { z } from 'zod';

import { type Chain } from '@/shared/core';

// Validates the remote chains config (CHAINS_CONFIG_URL) before it is trusted as `Chain[]`.
// Strict on the structure the app relies on (required keys, primitive types), tolerant of
// data that is only forwarded as-is: unknown extra keys are kept, and enum-like strings
// (options, asset/external types) are not pinned so a config update never blanks all chains.

const hexString = z.string().regex(/^0x[0-9a-fA-F]*$/);

const assetIconSchema = z.looseObject({
  monochrome: z.string(),
  colored: z.string(),
});

const assetSchema = z.looseObject({
  name: z.string(),
  assetId: z.number(),
  symbol: z.string(),
  staking: z.string().optional(),
  precision: z.number(),
  priceId: z.string().optional(),
  icon: assetIconSchema,
  type: z.string(),
  typeExtras: z.record(z.string(), z.unknown()).optional(),
});

const rpcNodeSchema = z.looseObject({
  url: z.string(),
  name: z.string(),
});

const explorerSchema = z.looseObject({
  name: z.string(),
  extrinsic: z.string().optional(),
  account: z.string().optional(),
  event: z.string().optional(),
  multisig: z.string().optional(),
});

const externalValueSchema = z.looseObject({
  type: z.string(),
  url: z.string(),
});

// `identityChain` / `timelineChain` are typed as required on ChainAdditional but most
// chains in the real config omit them, so the schema follows the data.
const chainAdditionalSchema = z.looseObject({
  identityChain: hexString.optional(),
  timelineChain: hexString.optional(),
  supportsGenericLedgerApp: z.boolean().optional(),
  defaultBlockTime: z.number().optional(),
});

const chainSchema = z.looseObject({
  chainId: hexString,
  parentId: hexString.optional(),
  specName: z.string(),
  name: z.string(),
  assets: z.array(assetSchema),
  nodes: z.array(rpcNodeSchema),
  explorers: z.array(explorerSchema).optional(),
  icon: z.string(),
  addressPrefix: z.number(),
  legacyAddressPrefix: z.number().optional(),
  externalApi: z.record(z.string(), z.array(externalValueSchema)).optional(),
  options: z.array(z.string()).optional(),
  additional: chainAdditionalSchema.optional(),
});

export const chainsConfigSchema = z.array(chainSchema);

export function parseChainsConfig(payload: unknown): Chain[] | null {
  const result = chainsConfigSchema.safeParse(payload);

  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    console.error(`Invalid chains config (${result.error.issues.length} issue(s)): ${issues}`);
    return null;
  }

  // Structure is verified above; enum-like strings are intentionally left unpinned.
  return result.data as Chain[];
}
