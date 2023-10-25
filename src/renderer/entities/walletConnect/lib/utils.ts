import type { Chain } from '@renderer/shared/core';

export const getWalletConnectChains = (chains: Chain[]) => {
  return chains.map((c) => `polkadot:${c.chainId.slice(2, 34)}`);
};
