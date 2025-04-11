import * as papiModule from 'polkadot-api';
import * as providerModule from 'polkadot-api/ws-provider/web';
import { beforeEach } from 'vitest';

import { chainsService } from '@/shared/api/network';
import { type Chain } from '@/shared/core';

import { __reset, getChainRegistry } from './chainRegistry';

const PolkadotChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

const MockedChains = [{ chainId: PolkadotChainId, name: 'Polkadot' }];

vi.mock('polkadot-api');
vi.mock('polkadot-api/ws-provider/web');

describe('ChainRegistry', () => {
  const getWsProviderMock = vi.fn();
  const destroyMock = vi.fn();
  const getTypedApiMock = vi.fn(() => 'typed_api');
  const createClientMock = vi.fn(() => {
    return {
      destroy: destroyMock,
      getTypedApi: getTypedApiMock,
    } as unknown as papiModule.PolkadotClient;
  });

  beforeEach(() => {
    vi.spyOn(chainsService, 'getChainsData').mockReturnValue(MockedChains as Chain[]);
    vi.spyOn(providerModule, 'getWsProvider').mockImplementation(getWsProviderMock);
    vi.spyOn(papiModule, 'createClient').mockImplementation(createClientMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    __reset();
  });

  it('should create a singleton instance', () => {
    expect(getChainRegistry()).toEqual(getChainRegistry());
  });

  it('should initialize with provided chains', () => {
    const registry = getChainRegistry();

    expect(registry.chainsList).toEqual(MockedChains);
    expect(registry.chainsMap.size).toBe(MockedChains.length);
    expect(registry.chainsMap.get(PolkadotChainId)).toEqual(MockedChains[0]);
  });

  it('should establish a connection to a chain', () => {
    const registry = getChainRegistry();

    const endpoints = ['wss://rpc.polkadot.io'];
    registry.connect(PolkadotChainId, endpoints);

    expect(getWsProviderMock).toHaveBeenCalledWith({
      endpoints,
      onStatusChanged: expect.any(Function),
    });
    expect(createClientMock).toHaveBeenCalled();
  });

  it('should register event handlers when provided', () => {
    const registry = getChainRegistry();

    const handlers = {
      connecting: vi.fn(),
      connected: vi.fn(),
      error: vi.fn(),
      closed: vi.fn(),
    };

    registry.connect(PolkadotChainId, ['wss://rpc.polkadot.io'], handlers);

    const onStatusChanged = getWsProviderMock.mock.calls[0]?.[0].onStatusChanged;

    onStatusChanged({ type: providerModule.WsEvent.CONNECTING });
    onStatusChanged({ type: providerModule.WsEvent.CONNECTED });
    onStatusChanged({ type: providerModule.WsEvent.ERROR });
    onStatusChanged({ type: providerModule.WsEvent.CLOSE });
    expect(handlers.connecting).toHaveBeenCalled();
    expect(handlers.connected).toHaveBeenCalled();
    expect(handlers.error).toHaveBeenCalled();
    expect(handlers.closed).toHaveBeenCalled();
  });

  it('should throw error if already connected to the chain', () => {
    const registry = getChainRegistry();

    registry.connect(PolkadotChainId, ['wss://rpc.polkadot.io']);

    expect(() => {
      registry.connect(PolkadotChainId, ['wss://rpc.polkadot.io']);
    }).toThrow(expect.any(Error));
  });

  it('should disconnect from a chain', () => {
    const registry = getChainRegistry();

    registry.connect(PolkadotChainId, ['wss://rpc.polkadot.io']);
    registry.disconnect(PolkadotChainId);

    expect(destroyMock).toHaveBeenCalled();

    // Verify that the chain was removed from storage
    expect(() => {
      registry.getApi(PolkadotChainId);
    }).toThrow(expect.any(Error));
  });

  it('should throw error if chain was already disconnected', () => {
    const registry = getChainRegistry();

    expect(() => {
      registry.disconnect(PolkadotChainId);
    }).toThrow(expect.any(Error));
  });

  it('should return chain API for a connected chain', () => {
    const registry = getChainRegistry();

    registry.connect(PolkadotChainId, ['wss://rpc.polkadot.io']);
    const api = registry.getApi(PolkadotChainId);

    expect(api).toEqual({ type: 'dot', api: 'typed_api' });
  });

  it('should throw error if chain is not connected', () => {
    const registry = getChainRegistry();

    expect(() => {
      registry.getApi(PolkadotChainId);
    }).toThrow(expect.any(Error));
  });

  it('should throw error if chain is not supported in CONFIG', () => {
    const registry = getChainRegistry();

    registry.connect('0x123', ['wss://rpc.polkadot.io']);

    expect(() => {
      registry.getApi('0x123');
    }).toThrow(expect.any(Error));
  });

  it('getChain should return chain by chainId', () => {
    const registry = getChainRegistry();
    const chain = registry.getChain(PolkadotChainId);

    expect(chain).toEqual(MockedChains[0]);
  });

  it('getChain should return undefined for absent chainId', () => {
    const registry = getChainRegistry();

    const chain = registry.getChain('0x123');
    expect(chain).toBeUndefined();
  });

  it('chainsMap should return the map of all chains', () => {
    const chainsMap = getChainRegistry().chainsMap;

    expect(chainsMap.size).toEqual(1);
    expect(chainsMap.get(PolkadotChainId)).toEqual(MockedChains[0]);
  });

  it('chainsList should return the array of all chains', () => {
    const chainsList = getChainRegistry().chainsList;

    expect(chainsList).toEqual(MockedChains);
  });
});
