import { useChains } from '../chainsService';
import { Chain } from '../common/types';

describe('service/network', () => {
  test('should init', () => {
    const params = useChains();

    expect(params.getChainsData).toBeDefined();
  });

  test('should sort data', async () => {
    const polkadot = { name: 'Polkadot' } as Chain;
    const kusama = { name: 'Kusama' } as Chain;
    const testnet = { name: 'Westend', options: ['testnet'] } as Chain;
    const parachain = { name: 'Acala' } as Chain;

    const { sortChains } = useChains();
    const data = sortChains([testnet, polkadot, parachain, kusama]);

    expect(data).toEqual([polkadot, kusama, parachain, testnet]);
  });
});
