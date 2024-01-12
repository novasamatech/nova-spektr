import { allSettled, fork } from 'effector';

import { networkModel } from '@entities/network';
import { ConnectionType } from '@shared/core';
import { storageService } from '@shared/api/storage';
import { proxiesModel } from '../proxies-model';

jest.mock('@remote-ui/rpc', () => ({
  createEndpoint: jest.fn().mockReturnValue({
    call: {
      initConnection: jest.fn().mockResolvedValue(''),
      getProxies: jest.fn().mockResolvedValue([]),
      disconnect: jest.fn(),
    },
  }),
}));

class MockWorker {
  onmessage: () => void;
  postMessage: () => void;
  terminate: () => void;
  onerror: () => void;
  onmessageerror: () => void;
  addEventListener: () => void;
  removeEventListener: () => void;
  dispatchEvent: () => boolean;

  constructor() {
    this.onmessage = jest.fn();
    this.postMessage = jest.fn();
    this.terminate = jest.fn();
    this.onerror = jest.fn();
    this.onmessageerror = jest.fn();
    this.addEventListener = jest.fn();
    this.removeEventListener = jest.fn();
    this.dispatchEvent = jest.fn();
  }
}

Worker = MockWorker;

describe('entities/proxy/model/proxy-model', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should add proxy ', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$chains, {
        '0x01': {
          chainId: '0x01',
          name: 'Westend',
          options: ['regular_proxy'],
        },
      }),
    });

    jest.spyOn(storageService.proxies, 'createAll').mockResolvedValue([]);

    await allSettled(proxiesModel.events.workerStarted, { scope });
    await allSettled(networkModel.$connections, {
      scope,
      params: {
        '0x01': {
          id: 1,
          chainId: '0x01',
          connectionType: ConnectionType.AUTO_BALANCE,
        },
      },
    });
  });
});
