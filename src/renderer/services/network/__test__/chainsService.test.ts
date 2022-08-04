import { useChains } from '../chainsService';
import chains from '../common/chains.json';
import { Chain } from '../common/types';

describe('service/network', () => {
  test('should init', () => {
    const params = useChains();

    expect(params.getChainsData).toBeDefined();
  });

  test('should provide data', async () => {
    const polkadot = chains.find((chain) => chain.name === 'Polkadot') as Chain;
    const kusama = chains.find((chain) => chain.name === 'Kusama') as Chain;
    const testnet = chains.find((chain) => chain.options?.includes('testnet')) as Chain;
    const parachain = chains.find(
      (chain) => chain.name !== 'Polkadot' && chain.name !== 'Kusama' && !chain.options?.includes('testnet'),
    ) as Chain;

    const { sortChains } = useChains();
    const data = sortChains([testnet, polkadot, parachain, kusama]);

    expect(data).toEqual([polkadot, kusama, parachain, testnet]);
  });
});
