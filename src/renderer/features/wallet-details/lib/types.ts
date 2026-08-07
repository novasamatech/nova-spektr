import {
  type ChainId,
  type VaultChainAccount,
  type VaultShardAccount,
  type VaultUniversalKeyAccount,
} from '@/shared/core';

/**
 * Bucket for keys the user did not scope to a network. It sits alongside the
 * chain ids in {@link VaultMap} so a key with no `chainId` still has a home.
 */
export const UNIVERSAL_KEYS_GROUP = 'universal';

export type VaultGroupId = ChainId | typeof UNIVERSAL_KEYS_GROUP;

export type VaultMap = Partial<
  Record<VaultGroupId, (VaultChainAccount | VaultUniversalKeyAccount | VaultShardAccount[])[]>
>;
