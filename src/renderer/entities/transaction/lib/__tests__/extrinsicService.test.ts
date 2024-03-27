import { ApiPromise } from '@polkadot/api';
import { TypeRegistry } from '@polkadot/types';
import { MockProvider } from '@polkadot/rpc-provider/mock';

import { metadata } from './metadata';
import { getExtrinsic } from '../extrinsicService';
import { extrinsicTests } from '../mock/extrinsicService.mock';

describe('entities/transaction/lib/extrinsicService.ts', () => {
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
