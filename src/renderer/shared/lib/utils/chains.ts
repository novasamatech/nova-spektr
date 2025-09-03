import { WellKnownChain } from '@substrate/connect';

import { type Address, type Chain, type ChainId, ChainOptions, type Explorer, type HexString } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { toAddress } from './address';
import { RelayChains, SS58_DEFAULT_PREFIX } from './constants';

export const toLocalChainId = (chainId?: ChainId): string => {
  return chainId ? chainId.replace('0x', '') : '';
};

export const toHexChainId = (chainId?: string): ChainId | undefined => {
  return `0x${chainId?.replace('0x', '')}`;
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
  return {
    [RelayChains.POLKADOT]: WellKnownChain.polkadot,
    [RelayChains.KUSAMA]: WellKnownChain.ksmcc3,
    [RelayChains.WESTEND]: WellKnownChain.westend2,
    [RelayChains.ROCOCO]: WellKnownChain.rococo_v2_2,
  }[chainId];
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

/**
 * Sorts chains in the order: Polkadot + parachains, then Kusama + parachains,
 * then others, and finally testnets. Within each group, relay chains come
 * first, then parachains are sorted alphabetically.
 *
 * @param chains Chains to sort
 *
 * @returns Sorted chains
 */
export function sortChains(chains: Chain[]): Chain[] {
  const polkadotChains: Chain[] = [];
  const kusamaChains: Chain[] = [];
  const otherChains: Chain[] = [];
  const testnetChains: Chain[] = [];

  for (const chain of chains) {
    if (chain.chainId === RelayChains.POLKADOT) {
      polkadotChains.unshift(chain); // Put Polkadot first
    } else if (chain.chainId === RelayChains.KUSAMA) {
      kusamaChains.unshift(chain); // Put Kusama first
    } else if (chain?.parentId === RelayChains.POLKADOT) {
      polkadotChains.push(chain);
    } else if (chain?.parentId === RelayChains.KUSAMA) {
      kusamaChains.push(chain);
    } else if (chain?.options?.includes(ChainOptions.TESTNET)) {
      testnetChains.push(chain);
    } else {
      otherChains.push(chain);
    }
  }

  // Helper to prioritize parachains with "polkadot" or "kusama" in their name
  function parachainPriority(chain: Chain, relay: 'polkadot' | 'kusama'): number {
    const name = chain.name.toLowerCase();
    if (name.includes(relay)) return 0;
    return 1;
  }

  // Sort parachains alphabetically within their groups, but prioritize those with "polkadot"/"kusama" in their name
  polkadotChains.sort((a, b) => {
    if (a.chainId === RelayChains.POLKADOT) return -1; // Polkadot always first
    if (b.chainId === RelayChains.POLKADOT) return 1;
    // Both are parachains, prioritize by name containing "polkadot"
    const pa = parachainPriority(a, 'polkadot');
    const pb = parachainPriority(b, 'polkadot');
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });

  kusamaChains.sort((a, b) => {
    if (a.chainId === RelayChains.KUSAMA) return -1; // Kusama always first
    if (b.chainId === RelayChains.KUSAMA) return 1;
    // Both are parachains, prioritize by name containing "kusama"
    const pa = parachainPriority(a, 'kusama');
    const pb = parachainPriority(b, 'kusama');
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });

  otherChains.sort((a, b) => a.name.localeCompare(b.name));
  testnetChains.sort((a, b) => a.name.localeCompare(b.name));

  return [...polkadotChains, ...kusamaChains, ...otherChains, ...testnetChains];
}
