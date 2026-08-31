import { z } from 'zod';

import { type Chain } from '@/shared/core';

// Validates the remote chains config (CHAINS_CONFIG_URL) before it is trusted as `Chain[]`.
// Strict on the structure the app relies on (required keys, primitive types), tolerant of
// data that is only forwarded as-is: unknown extra keys are kept, and enum-like strings
// (options, asset/external types) are not pinned so a config update never blanks all chains.
//
// Validation is all-or-nothing on purpose. `network-model` persists the last good result as
// `chains_map`, so rejecting the whole payload keeps that copy intact; filtering out only the
// broken chains would overwrite it with a partial list and silently drop networks.

const MAX_LOGGED_ISSUES = 5;

const chainIdSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);

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

const chainAdditionalSchema = z.looseObject({
  identityChain: chainIdSchema.optional(),
  timelineChain: chainIdSchema.optional(),
  supportsGenericLedgerApp: z.boolean().optional(),
  defaultBlockTime: z.number().optional(),
});

const chainSchema = z.looseObject({
  chainId: chainIdSchema,
  parentId: chainIdSchema.optional(),
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

/**
 * Validates a fetched chains config payload.
 *
 * @returns The payload typed as `Chain[]` when it matches the schema, otherwise
 *   `null` after logging the first {@link MAX_LOGGED_ISSUES} issues with their
 *   paths.
 */
export function parseChainsConfig(payload: unknown): Chain[] | null {
  const result = chainsConfigSchema.safeParse(payload);

  if (!result.success) {
    const issues = result.error.issues
      .slice(0, MAX_LOGGED_ISSUES)
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    console.error(`Invalid chains config (${result.error.issues.length} issue(s)): ${issues}`);
    return null;
  }

  // Structure is verified above; enum-like strings are intentionally left unpinned.
  return result.data as Chain[];
}
