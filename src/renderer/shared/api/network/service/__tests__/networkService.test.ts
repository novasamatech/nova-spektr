import { TypeRegistry } from '@polkadot/types';
import { MockProvider } from '@polkadot/rpc-provider/mock';

import { networkService } from '../networkService';
import { RpcValidation } from '../../lib/types';

const registry = new TypeRegistry();

jest.mock('@polkadot/rpc-provider', () => ({
  WsProvider: function () {
    return new MockProvider(registry);
  },
}));

describe('shared/api/network/service/networkService', () => {
  it('should validate rpc node', async () => {
    const chainId = '0x1234000000000000000000000000000000000000000000000000000000000000';
    const isValid = await networkService.validateRpcNode(chainId, 'ws://127.0.0.1:9944');

    expect(isValid).toEqual(RpcValidation.VALID);
  });
});
