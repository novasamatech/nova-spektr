import { ChainJSON } from './types';

export function prepareTestData(chains: ChainJSON[]): [ChainJSON[], ChainJSON[], ChainJSON[], ChainJSON, ChainJSON] {
  const networks: ChainJSON[] = [];
  const polkadotParachains: ChainJSON[] = [];
  const kusamaParachains: ChainJSON[] = [];

  const polkadot = chains.find(
    (chain) => chain.chainId == '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  )!;
  const kusama = chains.find(
    (chain) => chain.chainId == '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
  )!;
  chains.forEach((chain) => networks.push(<ChainJSON>chain));
  chains.filter((parachain) => {
    if (parachain.parentId == '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3') {
      polkadotParachains.push(<ChainJSON>parachain);
    }
  });
  chains.filter((parachain) => {
    if (parachain.parentId == '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe') {
      kusamaParachains.push(<ChainJSON>parachain);
    }
  });

  return [networks, polkadotParachains, kusamaParachains, polkadot, kusama];
}
