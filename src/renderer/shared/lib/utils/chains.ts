import { WellKnownChain } from '@substrate/connect';

import { type Address, type Chain, type ChainId, type Explorer, type HexString } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { toAddress } from './address';
import { RelayChains, SS58_DEFAULT_PREFIX } from './constants';

export const toLocalChainId = (chainId?: ChainId): string => {
  return chainId ? chainId.replace('0x', '') : '';
};

export const toHexChainId = (chainId?: string): ChainId | undefined => {
  return `0x${chainId?.replace('0x', '')}`;
};

/**
 * The chain whose blocks a pallet on `chain` counts in. For a migrated Asset
 * Hub that is its relay chain — `pallet_vesting` there stores relay block
 * numbers — and for everyone else it is the chain itself.
 *
 * Anything that turns one of those block numbers into a date must read _both_
 * the current height and the expected block time from this chain. Mixing the
 * two (a relay block dated with an Asset Hub's 2s clock) silently scales every
 * projection.
 */
export const getTimelineChainId = (chain: Chain): ChainId => {
  return chain.additional?.timelineChain ?? chain.chainId;
};

type WithAddress = { address: Address };
type WithAccountId = { value: Address | AccountId; addressPrefix?: number };
/**
 * Get block explorer URL by AccountId or Address
 *
 * @param explorer Explorer with links
 * @param params Address or accountId with addressPrefix
 *
 * @returns {String | undefined}
 */
export const getAccountExplorer = (explorer: Explorer, params: WithAddress | WithAccountId): string | undefined => {
  const replacer =
    'value' in params
      ? toAddress(params.value, { prefix: params.addressPrefix ?? SS58_DEFAULT_PREFIX })
      : params.address;

  return explorer.account?.replace('{address}', replacer);
};

/**
 * Get extrinsic explorer URL by hash
 *
 * @param explorer Explorer with links
 * @param hash Extrinsic hash
 *
 * @returns {String | undefined}
 */
export const getExtrinsicExplorer = (explorer: Explorer, hash: HexString): string | undefined => {
  return explorer.extrinsic?.replace('{hash}', hash);
};

/**
 * Get relay chain id that are relevant chain specification and are likely to be
 * connected to
 *
 * @param chainId Genesis hash of the chain
 *
 * @returns {WellKnownChain | undefined}
 */
export function getKnownChain(chainId: ChainId): WellKnownChain | undefined {
  return (
    {
      [RelayChains.POLKADOT]: WellKnownChain.polkadot,
      [RelayChains.KUSAMA]: WellKnownChain.ksmcc3,
      [RelayChains.WESTEND]: WellKnownChain.westend2,
      [RelayChains.ROCOCO]: WellKnownChain.rococo_v2_2,
    } as Record<string, WellKnownChain>
  )[chainId];
}

/**
 * Checks whether chainId is equal to Polkadot
 *
 * @param chainId Genesis hash of the chain
 *
 * @returns Boolean
 */
export function isPolkadotChain(chainId: ChainId): boolean {
  return chainId === RelayChains.POLKADOT;
}
