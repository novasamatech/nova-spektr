import { ApiPromise } from '@polkadot/api';

import { metadataService } from '../service/metadataService';

describe('shared/api/network/services/metadataService', () => {
  test('should return UnsubscribePromise on subscribeMetadata', async () => {
    const unsub = () => 5;
    const apiMock = {
      rpc: { state: { subscribeRuntimeVersion: () => Promise.resolve(unsub) } },
    } as unknown as ApiPromise;

    const result = await metadataService.subscribeMetadata(apiMock, () => {});
    expect(result).toEqual(unsub);
    expect(unsub()).toEqual(5);
  });

  test('should return metadata on requestMetadata', async () => {
    const version = { specVersion: { toNumber: () => 5 } };
    const metadata = { toHex: () => '0x11' };

    const apiMock = {
      genesisHash: { toHex: () => '0x00' },
      rpc: {
        state: {
          getMetadata: () => Promise.resolve(metadata),
          getRuntimeVersion: () => Promise.resolve(version),
        },
      },
    } as unknown as ApiPromise;

    const result = await metadataService.requestMetadata(apiMock);
    expect(result).toEqual({ metadata: '0x11', version: 5, chainId: '0x00' });
  });
});
