import { useChains } from '../chainsService';
import { Chain } from '@renderer/domain/chain';

describe('service/chainsService', () => {
  test('should init', () => {
    const { sortChains, getChainsData, getStakingChainsData } = useChains();

    expect(sortChains).toBeDefined();
    expect(getChainsData).toBeDefined();
    expect(getStakingChainsData).toBeDefined();
  });

  test('should sort data', () => {
    const polkadot = { name: 'Polkadot' } as Chain;
    const kusama = { name: 'Kusama' } as Chain;
    const testnet = { name: 'Westend', options: ['testnet'] } as Chain;
    const parachain = { name: 'Acala' } as Chain;

    const { sortChains } = useChains();
    const data = sortChains([testnet, polkadot, parachain, kusama]);

    expect(data).toEqual([polkadot, kusama, parachain, testnet]);
  });
});
