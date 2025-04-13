import { noop } from 'lodash';
import * as papiModule from 'polkadot-api';
import * as providerModule from 'polkadot-api/ws-provider/web';
import { beforeEach } from 'vitest';

import { chainsService } from '@/shared/api/network';
import { type Chain } from '@/shared/core';
import { polkadotChainId } from '@/shared/mocks';

import { __reset, getChainRegistry } from './chainRegistry';

const MockedChains = [{ chainId: polkadotChainId, name: 'Polkadot' }];

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
    expect(registry.chainsMap.get(polkadotChainId)).toEqual(MockedChains[0]);
  });

  it('should establish a connection to a chain', () => {
    const registry = getChainRegistry();

    const endpoints = ['wss://rpc.polkadot.io'];
    registry.connect(polkadotChainId, endpoints);

    expect(getWsProviderMock).toHaveBeenCalledWith({
      endpoints,
      onStatusChanged: expect.any(Function),
    });
    expect(createClientMock).toHaveBeenCalled();
  });

  it('should register event handlers when provided', () => {
    let statusCallback = noop;

    vi.spyOn(providerModule, 'getWsProvider').mockImplementation(({ onStatusChanged }) => {
      statusCallback = onStatusChanged || noop;

      const returnFn = () => ({ send: vi.fn(), disconnect: vi.fn() });
      const wsObject = { switch: vi.fn(), getStatus: vi.fn() };

      return Object.assign(returnFn, wsObject);
    });

    const registry = getChainRegistry();

    const handleStatusChange = vi.fn();

    registry.on(polkadotChainId, 'status', handleStatusChange);
    registry.connect(polkadotChainId, ['wss://rpc.polkadot.io']);

    [
      providerModule.WsEvent.CONNECTING,
      providerModule.WsEvent.CONNECTED,
      providerModule.WsEvent.ERROR,
      providerModule.WsEvent.CLOSE,
    ].forEach(type => {
      statusCallback({ chainId: polkadotChainId, type });
      expect(handleStatusChange).toHaveBeenCalledWith({ chainId: polkadotChainId, type });
    });
  });

  it('should throw error if already connected to the chain', () => {
    const registry = getChainRegistry();

    registry.connect(polkadotChainId, ['wss://rpc.polkadot.io']);

    expect(() => {
      registry.connect(polkadotChainId, ['wss://rpc.polkadot.io']);
    }).toThrow(expect.any(Error));
  });

  it('should disconnect from a chain', () => {
    const registry = getChainRegistry();

    registry.connect(polkadotChainId, ['wss://rpc.polkadot.io']);
    registry.disconnect(polkadotChainId);

    expect(destroyMock).toHaveBeenCalled();

    // Verify that the chain was removed from storage
    expect(() => {
      registry.getApi(polkadotChainId);
    }).toThrow(expect.any(Error));
  });

  it('should throw error if chain was already disconnected', () => {
    const registry = getChainRegistry();

    expect(() => {
      registry.disconnect(polkadotChainId);
    }).toThrow(expect.any(Error));
  });

  it('should return chain API for a connected chain', () => {
    const registry = getChainRegistry();

    registry.connect(polkadotChainId, ['wss://rpc.polkadot.io']);
    const api = registry.getApi(polkadotChainId);

    expect(api).toEqual({ type: 'dot', api: 'typed_api' });
  });

  it('should throw error if chain is not connected', () => {
    const registry = getChainRegistry();

    expect(() => {
      registry.getApi(polkadotChainId);
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
    const chain = registry.getChain(polkadotChainId);

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
    expect(chainsMap.get(polkadotChainId)).toEqual(MockedChains[0]);
  });

  it('chainsList should return the array of all chains', () => {
    const chainsList = getChainRegistry().chainsList;

    expect(chainsList).toEqual(MockedChains);
  });
});
