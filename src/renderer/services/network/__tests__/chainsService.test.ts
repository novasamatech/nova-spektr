import { useChains } from '../chainsService';

describe('service/chainsService', () => {
  test('should init', () => {
    const { sortChains, sortChainsByBalance, getChainsData, getStakingChainsData } = useChains();

    expect(sortChains).toBeDefined();
    expect(sortChainsByBalance).toBeDefined();
    expect(getChainsData).toBeDefined();
    expect(getStakingChainsData).toBeDefined();
  });

  test('should sort chains', () => {
    const polkadot = { name: 'Polkadot' };
    const kusama = { name: 'Kusama' };
    const threeDPass = { name: '3dPass' };
    const testnet = { name: 'Westend', options: ['testnet'] };
    const parachain = { name: 'Acala' };

    const { sortChains } = useChains();
    const data = sortChains([testnet, polkadot, threeDPass, parachain, kusama]);

    expect(data).toEqual([polkadot, kusama, parachain, threeDPass, testnet]);
  });
});
