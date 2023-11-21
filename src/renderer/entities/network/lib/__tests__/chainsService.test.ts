import { chainsService } from '../chainsService';
import type { HexString } from '@shared/core';

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
      chainId: '0x00' as HexString,
      assets,
      nodes: [],
      icon: '',
      addressPrefix: 42,
    };
    const kusama = { name: 'Kusama', chainId: '0x01' as HexString, assets, nodes: [], icon: '', addressPrefix: 42 };
    const threeDPass = { name: '3dPass', chainId: '0x02' as HexString, assets, nodes: [], icon: '', addressPrefix: 42 };
    const testnet = {
      name: 'Westend',
      chainId: '0x03' as HexString,
      assets,
      nodes: [],
      icon: '',
      addressPrefix: 42,
      options: ['testnet'],
    };
    const parachain = { name: 'Acala', chainId: '0x04' as HexString, assets, nodes: [], icon: '', addressPrefix: 42 };

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
