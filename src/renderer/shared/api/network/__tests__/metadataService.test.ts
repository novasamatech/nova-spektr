import { type ApiPromise } from '@polkadot/api';

import { metadataService } from '../service/metadataService';

describe('shared/api/network/services/metadataService', () => {
  test('should return UnsubscribePromise on subscribeRuntimeVersion', async () => {
    const unsub = () => 5;
    const apiMock = {
      genesisHash: { toHex: () => '0x1234' },
      rpc: { state: { subscribeRuntimeVersion: () => Promise.resolve(unsub) } },
    } as unknown as ApiPromise;

    const result = await metadataService.subscribeRuntimeVersion({
      api: apiMock,
      callback: () => {},
    });
    expect(result).toEqual(unsub);
    expect(unsub()).toEqual(5);
  });
});
