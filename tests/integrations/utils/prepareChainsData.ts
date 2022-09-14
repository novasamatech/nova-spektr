import { ChainJSON } from './types';

export function prepareTestData(chains: ChainJSON[]): [ChainJSON[], ChainJSON[], ChainJSON[], ChainJSON, ChainJSON] {
  const kusamaId = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';
  const polkadotId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

  const polkadot = chains.find((chain) => chain.chainId === polkadotId)!;
  const kusama = chains.find((chain) => chain.chainId === kusamaId)!;

  const [polkadotParachains, kusamaParachains] = chains.reduce(
    (result, currentChain) => {
      currentChain.parentId === kusamaId
        ? result[0].push(currentChain)
        : currentChain.parentId === polkadotId
        ? result[1].push(currentChain)
        : null;

      return result;
    },
    [<ChainJSON[]>(<unknown>[]), <ChainJSON[]>(<unknown>[])],
  );

  return [chains, polkadotParachains, kusamaParachains, polkadot, kusama];
}
