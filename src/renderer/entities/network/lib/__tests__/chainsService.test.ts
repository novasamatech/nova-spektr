import { chainsService } from '../chainsService';
import type { HexString, Chain } from '@shared/core';

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

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

  test('should sort chains with balances', () => {
    const assets = [
      {
        assetId: 1,
        priceId: '1',
        name: '',
        symbol: '',
        precision: 0,
        icon: '',
      },
      {
        assetId: 2,
        priceId: '2',
        name: '',
        symbol: '',
        precision: 0,
        icon: '',
      },
    ];

    const polkadot = {
      name: 'Polkadot',
      specName: 'polkadot',
      chainId: '0x00' as HexString,
      assets,
    } as Chain;
    const kusama = {
      name: 'Kusama',
      specName: 'kusama',
      chainId: '0x01' as HexString,
      assets,
    } as Chain;
    const threeDPass = {
      name: '3dPass',
      specName: '3dpass',
      chainId: '0x02' as HexString,
      assets,
    } as Chain;
    const testnet = {
      name: 'Westend',
      specName: 'westend',
      chainId: '0x03' as HexString,
      assets,
      options: ['testnet'],
    } as Chain;
    const parachain = {
      name: 'Acala',
      specName: 'acala',
      chainId: '0x04' as HexString,
      assets,
    } as Chain;

    const balances = [
      {
        accountId: '0x00' as HexString,
        chainId: '0x00' as HexString,
        assetId: '1',
        free: '2',
      },
      {
        accountId: '0x00' as HexString,
        chainId: '0x00' as HexString,
        assetId: '2',
        free: '2',
      },
      {
        accountId: '0x00' as HexString,
        chainId: '0x01' as HexString,
        assetId: '2',
        free: '2',
      },
      {
        accountId: '0x00' as HexString,
        chainId: '0x02' as HexString,
        assetId: '2',
        free: '2',
      },
      {
        accountId: '0x00' as HexString,
        chainId: '0x02' as HexString,
        assetId: '2',
        free: '1',
      },
    ];

    const assetsPrices = {
      '1': {
        usd: {
          price: 1,
          change: 0,
        },
      },
      '2': {
        usd: {
          price: 0.1,
          change: 0,
        },
      },
    };

    const data = chainsService.sortChainsByBalance(
      [testnet, polkadot, threeDPass, parachain, kusama],
      balances,
      assetsPrices,
      'usd',
    );

    expect(data).toEqual([polkadot, threeDPass, kusama, parachain, testnet]);
  });
});
