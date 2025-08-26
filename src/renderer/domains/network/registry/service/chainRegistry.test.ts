import { noop } from 'lodash';
import { type PolkadotClient } from 'polkadot-api';
import { WsEvent } from 'polkadot-api/ws-provider/web';

import { polkadotChain, polkadotChainId } from '@/shared/mocks';

import { ChainRegistry, getChainRegistry } from './chainRegistry';

describe('ChainRegistry', () => {
  let registry: ChainRegistry;

  const chainsMock = [polkadotChain];

  let statusCallback = noop;
  const getWsProviderMock = vi.fn().mockImplementation(({ onStatusChanged }) => {
    statusCallback = onStatusChanged || noop;

    const returnFn = () => ({ send: vi.fn(), disconnect: vi.fn() });
    const wsObject = { switch: vi.fn(), getStatus: vi.fn() };

    return Object.assign(returnFn, wsObject);
  });

  const destroyMock = vi.fn();
  const getTypedApiMock = vi.fn(() => 'typed_api');
  const createClientMock = vi.fn(() => {
    return {
      destroy: destroyMock,
      getTypedApi: getTypedApiMock,
    } as unknown as PolkadotClient;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    registry = new ChainRegistry(chainsMock, {
      createWcProvider: getWsProviderMock,
      createClient: createClientMock,
    });
  });

  it('should create a singleton instance', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(chainsMock),
      } as Response),
    );
    const instanceA = await getChainRegistry();
    const instanceB = await getChainRegistry();
    expect(instanceA).toEqual(instanceB);
  });

  it('should initialize with provided chains', () => {
    expect(registry.chainsList).toEqual(chainsMock);
    expect(registry.chainsMap.size).toEqual(1);
    expect(registry.chainsMap.get(polkadotChainId)).toEqual(polkadotChain);
  });

  it('should establish a connection to a chain', () => {
    const endpoints = ['wss://rpc.polkadot.io'];
    registry.connect(polkadotChainId, endpoints);

    expect(getWsProviderMock).toHaveBeenCalledWith({
      endpoints,
      onStatusChanged: expect.any(Function),
    });
    expect(createClientMock).toHaveBeenCalled();
  });

  it('should register event handlers when provided', () => {
    const handleStatusChange = vi.fn();

    registry.on(polkadotChainId, 'status', handleStatusChange);
    registry.connect(polkadotChainId, ['wss://rpc.polkadot.io']);

    [WsEvent.CONNECTING, WsEvent.CONNECTED, WsEvent.ERROR, WsEvent.CLOSE].forEach(type => {
      statusCallback({ chainId: polkadotChainId, type });
      expect(handleStatusChange).toHaveBeenCalledWith({ chainId: polkadotChainId, type });
    });
  });

  it('should throw error if already connected to the chain', () => {
    registry.connect(polkadotChainId, ['wss://rpc.polkadot.io']);

    expect(() => {
      registry.connect(polkadotChainId, ['wss://rpc.polkadot.io']);
    }).toThrow(expect.any(Error));
  });

  it('should disconnect from a chain', () => {
    registry.connect(polkadotChainId, ['wss://rpc.polkadot.io']);
    registry.disconnect(polkadotChainId);

    expect(destroyMock).toHaveBeenCalled();

    // Verify that the chain was removed from storage
    expect(() => {
      registry.getApi(polkadotChainId);
    }).toThrow(expect.any(Error));
  });

  it('should throw error if chain was already disconnected', () => {
    expect(() => {
      registry.disconnect(polkadotChainId);
    }).toThrow(expect.any(Error));
  });

  it('should return general chain API for connected chain', () => {
    registry.connect(polkadotChainId, ['wss://rpc.polkadot.io']);
    const api = registry.getApi(polkadotChainId);

    expect(api).toEqual({ type: 'dot', api: 'typed_api' });
  });

  it('should throw error if chain is not connected', () => {
    expect(() => {
      registry.getApi(polkadotChainId);
    }).toThrow(expect.any(Error));
  });

  it('should throw error if chain is not supported in CONFIG', () => {
    registry.connect('0x123', ['wss://rpc.polkadot.io']);

    expect(() => {
      registry.getApi('0x123');
    }).toThrow(expect.any(Error));
  });

  it('getChain should return chain by chainId', () => {
    expect(registry.getChain(polkadotChainId)).toEqual(polkadotChain);
  });

  it('getChain should return undefined for absent chainId', () => {
    expect(registry.getChain('0x123')).toBeUndefined();
  });

  it('chainsMap should return the map of all chains', () => {
    expect(registry.chainsMap.size).toEqual(1);
    expect(registry.chainsMap.get(polkadotChainId)).toEqual(chainsMock[0]);
  });

  it('chainsList should return the array of all chains', () => {
    expect(registry.chainsList).toEqual(chainsMock);
  });
});
