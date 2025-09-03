import { type Chain, ChainOptions } from '@/shared/core';

import { RelayChains } from './constants';

/**
 * Sorts chains in the order: Polkadot + parachains, then Kusama + parachains,
 * then others, and finally testnets. Within each group, relay chains come
 * first, then parachains are sorted alphabetically.
 */
export function sortChains(chains: Chain[]): Chain[] {
  const polkadotChains: Chain[] = [];
  const kusamaChains: Chain[] = [];
  const otherChains: Chain[] = [];
  const testnetChains: Chain[] = [];

  for (const chain of chains) {
    // Check if it's Polkadot relay chain
    if (chain.chainId === RelayChains.POLKADOT) {
      polkadotChains.unshift(chain); // Put Polkadot first
    }
    // Check if it's Kusama relay chain
    else if (chain.chainId === RelayChains.KUSAMA) {
      kusamaChains.unshift(chain); // Put Kusama first
    }
    // Check if it's a Polkadot parachain
    else if (chain?.parentId === RelayChains.POLKADOT) {
      polkadotChains.push(chain);
    }
    // Check if it's a Kusama parachain
    else if (chain?.parentId === RelayChains.KUSAMA) {
      kusamaChains.push(chain);
    }
    // Check if it's a testnet (by name or a property, here we use name as a heuristic)
    else if (chain.options?.includes(ChainOptions.TESTNET)) {
      testnetChains.push(chain);
    }
    // Other chains
    else {
      otherChains.push(chain);
    }
  }

  // Helper to prioritize parachains with "polkadot" or "kusama" in their name
  function parachainPriority(chain: Chain, relay: 'polkadot' | 'kusama'): number {
    const name = chain.name.toLowerCase();
    if (name.includes(relay)) return 0; // Highest priority among parachains
    return 1; // Lower priority
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

  // Return in the requested order: Polkadot + parachains, then Kusama + parachains, then others, then testnets
  return [...polkadotChains, ...kusamaChains, ...otherChains, ...testnetChains];
}
