import type Provider from '@walletconnect/universal-provider';

import { type HexString } from '@/shared/core';

import { walletConnectService } from './service';

describe('entities/walletConnect/lib/onChainUtils', () => {
  test('should return chain ids in wallet connect type', () => {
    const chains = [
      { chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as HexString },
      { chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe' as HexString },
    ];

    const result = walletConnectService.getWalletConnectChains(chains);

    expect(result).toEqual(['polkadot:91b171bb158e2d3848fa23a9f1c25182', 'polkadot:b0a8d493285c2df73290dfb7e61f870f']);
  });

  test('should return false if not connected', () => {
    const provider = {
      client: {
        session: {
          getAll: () => [],
        },
      },
    } as unknown as Provider;

    const result = walletConnectService.isConnected(provider, 'topic');

    expect(result).toEqual(false);
  });

  test('should return true if connected', () => {
    const provider = {
      client: {
        session: {
          getAll: () => ['topic'],
        },
      },
    } as unknown as Provider;

    const result = walletConnectService.isConnected(provider, 'topic');

    expect(result).toEqual(false);
  });
});
