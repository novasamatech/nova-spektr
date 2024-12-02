import { ApiPromise } from '@polkadot/api';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';

import { getExtrinsic } from '../extrinsicService';
import { extrinsicTests } from '../mock/extrinsicService.mock';

import { metadata } from './metadata';

describe('entities/transaction/lib/extrinsicService', () => {
  const registry = new TypeRegistry();
  let provider: MockProvider;
  let api: ApiPromise;

  beforeEach(async (): Promise<void> => {
    provider = new MockProvider(registry);

    const genesisHash = registry.createType('Hash', await provider.send('chain_getBlockHash', [])).toHex();

    const specVersion = 0;

    api = await ApiPromise.create({
      metadata: { [`${genesisHash}-${specVersion}`]: metadata },
      provider,
      registry,
      throwOnConnect: true,
    });
  });

  afterEach(async () => {
    await provider.disconnect();
  });

  test.each(extrinsicTests)('$testName', ({ transactionType, args, callData }) => {
    const extrinsic = getExtrinsic[transactionType](args, api);

    expect(extrinsic.method.toHex()).toEqual(callData);
  });
});
