import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import {
  type AccountId,
  AccountType,
  ChainOptions,
  ConnectionType,
  type HexString,
  type ProxyAccount,
} from '@/shared/core';
import { networkModel } from '@/entities/network';
import { proxyModel } from '@/entities/proxy';
import { walletModel } from '@/entities/wallet';
import { proxiesModel } from '../proxies-model';

jest.mock('@remote-ui/rpc', () => ({
  createEndpoint: jest.fn().mockReturnValue({
    call: {
      initConnection: jest.fn().mockResolvedValue(''),
      getProxies: jest.fn().mockResolvedValue({
        proxiesToAdd: [
          {
            accountId: '0x02',
            chainId: '0x01',
            proxiedAccountId: '0x01',
            proxyType: 'Governance',
            delay: 0,
          },
        ],
        proxiesToRemove: [],
        proxiedAccountsToAdd: [],
        proxiedAccountsToRemove: [],
        deposits: {
          chainId: '0x01',
          deposits: { '0x01': '1,002,050,000,000' },
        },
      }),
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

// eslint-disable-next-line no-global-assign
Worker = MockWorker;

describe('features/proxies/model/proxies-model', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should add $proxies and $proxyGroups ', async () => {
    const newProxy = {
      chainId: '0x01' as HexString,
      accountId: '0x02' as AccountId,
      proxiedAccountId: '0x01' as AccountId,
      proxyType: 'Governance',
      delay: 0,
    } as ProxyAccount;

    jest.spyOn(storageService.proxies, 'createAll').mockResolvedValue([newProxy]);
    jest.spyOn(storageService.proxyGroups, 'createAll').mockImplementation(async (value) => {
      return value.map((value, id) => ({ id, ...value }));
    });

    const scope = fork({
      values: new Map()
        .set(walletModel._test.$allWallets, [
          { id: 1, accounts: [{ walletId: 1, accountId: '0x01', type: AccountType.CHAIN, chainId: '0x01' }] },
        ])
        .set(networkModel.$chains, {
          '0x01': { chainId: '0x01', name: 'Westend', options: [ChainOptions.REGULAR_PROXY] },
        }),
    });

    await allSettled(proxiesModel.events.workerStarted, { scope });
    await allSettled(networkModel.$connections, {
      scope,
      params: { '0x01': { id: 1, chainId: '0x01', connectionType: ConnectionType.AUTO_BALANCE, customNodes: [] } },
    });

    expect(scope.getState(proxyModel.$proxies)).toEqual({ '0x01': [newProxy] });
    expect(scope.getState(proxyModel.$proxyGroups)).toEqual([
      { id: 0, chainId: '0x01', proxiedAccountId: '0x01', totalDeposit: '1,002,050,000,000', walletId: 1 },
    ]);
  });
});
