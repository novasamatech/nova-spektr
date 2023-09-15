import { chainsService } from '../chainsService';

describe('service/chainsService', () => {
  test('should init', () => {
    expect(chainsService.sortChains).toBeDefined();
    expect(chainsService.sortChainsByBalance).toBeDefined();
    expect(chainsService.getChainsData).toBeDefined();
    expect(chainsService.getStakingChainsData).toBeDefined();
  });

  test('should sort chains', () => {
    const polkadot = { name: 'Polkadot' };
    const kusama = { name: 'Kusama' };
    const threeDPass = { name: '3dPass' };
    const testnet = { name: 'Westend', options: ['testnet'] };
    const parachain = { name: 'Acala' };

    const data = chainsService.sortChains([testnet, polkadot, threeDPass, parachain, kusama]);

    expect(data).toEqual([polkadot, kusama, parachain, threeDPass, testnet]);
  });
});
