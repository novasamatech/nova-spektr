import { type Chain } from '@/shared/core';

export function prepareTestData(chains: Chain[]): [Chain[], Chain[], Chain[], Chain, Chain] {
  const kusamaId = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';
  const polkadotId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

  const polkadot = chains.find((chain) => chain.chainId === polkadotId)!;
  const kusama = chains.find((chain) => chain.chainId === kusamaId)!;

  const [polkadotParachains, kusamaParachains] = chains.reduce<[Chain[], Chain[]]>(
    (acc, currentChain) => {
      if (currentChain.parentId === polkadotId) {
        acc[0].push(currentChain);
      } else if (currentChain.parentId === kusamaId) {
        acc[1].push(currentChain);
      }

      return acc;
    },
    [[], []],
  );

  return [chains, polkadotParachains, kusamaParachains, polkadot, kusama];
}
