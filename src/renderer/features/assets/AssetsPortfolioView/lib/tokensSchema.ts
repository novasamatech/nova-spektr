import { z } from 'zod';

import { type AssetByChains } from '@/shared/core';

// Validates the remote tokens config (TOKENS_CONFIG_URL) before it is trusted as `AssetByChains[]`.
// Same policy as the chains schema: strict on structure, unknown keys kept, enum-like strings
// (asset type) unpinned, and all-or-nothing so a malformed payload never yields a partial list.
// The wire format carries no `balance`; it is filled in at runtime by `getChainWithBalance`.

const MAX_LOGGED_ISSUES = 5;

const chainIdSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);

const assetChainSchema = z.looseObject({
  chainId: chainIdSchema,
  name: z.string(),
  assetId: z.number(),
  assetSymbol: z.string(),
  type: z.string().optional(),
  typeExtras: z.record(z.string(), z.unknown()).optional(),
});

const tokenSchema = z.looseObject({
  name: z.string(),
  precision: z.number(),
  icon: z.looseObject({
    monochrome: z.string(),
    colored: z.string(),
  }),
  symbol: z.string(),
  isTestToken: z.boolean().optional(),
  priceId: z.string().optional(),
  chains: z.array(assetChainSchema),
});

export const tokensConfigSchema = z.array(tokenSchema);

/**
 * Validates a fetched tokens config payload.
 *
 * @returns The payload typed as `AssetByChains[]` when it matches the schema,
 *   otherwise `null` after logging the first {@link MAX_LOGGED_ISSUES} issues
 *   with their paths.
 */
export function parseTokensConfig(payload: unknown): AssetByChains[] | null {
  const result = tokensConfigSchema.safeParse(payload);

  if (!result.success) {
    const issues = result.error.issues
      .slice(0, MAX_LOGGED_ISSUES)
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    console.error(`Invalid tokens config (${result.error.issues.length} issue(s)): ${issues}`);
    return null;
  }

  return result.data as AssetByChains[];
}
