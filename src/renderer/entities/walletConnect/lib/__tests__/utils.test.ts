import type Provider from '@walletconnect/universal-provider';

import { type Chain } from '@/shared/core';
import { walletConnectUtils } from '../utils';

describe('entities/walletConnect/lib/onChainUtils', () => {
  test('should return chain ids in wallet connect type', () => {
    const chains = [
      {
        chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      },
      {
        chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
      },
    ];

    const result = walletConnectUtils.getWalletConnectChains(chains as unknown as Chain[]);

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

    const result = walletConnectUtils.isConnected(provider, 'topic');

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

    const result = walletConnectUtils.isConnected(provider, 'topic');

    expect(result).toEqual(false);
  });
});
