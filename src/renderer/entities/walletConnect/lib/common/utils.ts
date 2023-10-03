import { Chain } from '@renderer/entities/chain';

export const getWalletConnectChains = (chains: Chain[]) => {
  return chains.map((c) => `polkadot:${c.chainId.slice(2, 34)}`);
};
