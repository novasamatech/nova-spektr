import { fork, allSettled } from 'effector';
import noop from 'lodash/noop';

import { balanceSubModel } from '../balance-sub-model';
import { Wallet, ChainId, Chain, AccountType, Balance, ConnectionStatus } from '@shared/core';
import { storageService } from '@shared/api/storage';
import { walletModel } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { TEST_ACCOUNTS } from '@shared/lib/utils';
import { balanceModel } from '@entities/balance';
import { balanceService } from '@shared/api/balances';

describe('features/balances/subscription/model/balance-sub-model', () => {
  const chains = {
    '0x01': { name: 'My chain 1', chainId: '0x01' },
    '0x02': { name: 'My chain 2', chainId: '0x02' },
    '0x03': { name: 'My chain 3', chainId: '0x03' },
  } as unknown as Record<ChainId, Chain>;

  const accounts = [
    {
      id: 1,
      walletId: 2,
      accountId: TEST_ACCOUNTS[0],
      type: AccountType.BASE,
    },
    {
      id: 2,
      walletId: 2,
      accountId: TEST_ACCOUNTS[1],
      type: AccountType.CHAIN,
      chainId: '0x02',
    },
  ];

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.restoreAllMocks();

    jest.spyOn(storageService.balances, 'readAll').mockResolvedValue([]);
    jest.spyOn(storageService.balances, 'insertAll').mockResolvedValue([]);
  });

  test('should set initial $subAccounts on $chains & $activeWallet first change', async () => {
    const wallet = { id: 1, isActive: true, name: 'My wallet' } as Wallet;

    const scope = fork({});

    const actions = Promise.all([
      allSettled(walletModel.$wallets, { scope, params: [wallet] }),
      allSettled(networkModel.$chains, { scope, params: chains }),
    ]);

    await jest.runAllTimersAsync();
    await actions;

    expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual({
      '0x01': { 1: [] },
      '0x02': { 1: [] },
      '0x03': { 1: [] },
    });
  });

  test('should update $subAccounts on walletToUnsubSet', async () => {
    const subAccounts = { '0x01': { 1: [], 2: [] }, '0x02': { 1: [], 2: [] } };
    const wallet = { id: 1, isActive: false, name: 'My wallet' } as Wallet;

    const scope = fork({
      values: new Map().set(balanceSubModel.__$subAccounts, subAccounts),
    });

    const action = allSettled(balanceSubModel.events.walletToUnsubSet, { scope, params: wallet });

    await jest.runAllTimersAsync();
    await action;

    expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual({ '0x01': { 2: [] }, '0x02': { 2: [] } });
  });

  test('should update $subAccounts on $previousWallet change', async () => {
    const subAccounts = { '0x01': { 1: [], 2: [] }, '0x02': { 1: [], 2: [] } };
    const wallets = [
      { id: 1, isActive: true, name: 'My active wallet' },
      { id: 2, isActive: false, name: 'My inactive wallet' },
    ] as Wallet[];

    const newWallets = [
      { ...wallets[0], isActive: false },
      { ...wallets[1], isActive: true },
    ];

    const scope = fork({
      values: new Map().set(balanceSubModel.__$subAccounts, subAccounts).set(walletModel.$wallets, wallets),
    });

    const actions = Promise.all([
      allSettled(walletModel.$wallets, { scope, params: wallets }),
      allSettled(walletModel.$wallets, { scope, params: newWallets }),
    ]);

    await jest.runAllTimersAsync();
    await actions;

    expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual({ '0x01': { 2: [] }, '0x02': { 2: [] } });
  });

  test('should update $subAccounts on walletToSubSet', async () => {
    const subAccounts = { '0x01': { 1: [] }, '0x02': { 1: [] } };
    const wallet = { id: 2, isActive: false, name: 'My wallet' } as Wallet;

    const scope = fork({
      values: new Map().set(balanceSubModel.__$subAccounts, subAccounts).set(walletModel.$accounts, accounts),
    });

    const action = allSettled(balanceSubModel.events.walletToSubSet, { scope, params: wallet });

    await jest.runAllTimersAsync();
    await action;

    expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual({
      '0x01': { 1: [], 2: [TEST_ACCOUNTS[0]] },
      '0x02': { 1: [], 2: [TEST_ACCOUNTS[0], TEST_ACCOUNTS[1]] },
    });
  });

  test('should update $subAccounts on $activeWallet change', async () => {
    const subAccounts = { '0x01': { 1: [] }, '0x02': { 1: [] } };
    const wallet = { id: 2, isActive: true, name: 'My new wallet' } as Wallet;

    const scope = fork({
      values: new Map().set(balanceSubModel.__$subAccounts, subAccounts).set(walletModel.$accounts, accounts),
    });

    const action = allSettled(walletModel.$wallets, { scope, params: [wallet] });

    await jest.runAllTimersAsync();
    await action;

    expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual({
      '0x01': { 1: [], 2: [TEST_ACCOUNTS[0]] },
      '0x02': { 1: [], 2: [TEST_ACCOUNTS[0], TEST_ACCOUNTS[1]] },
    });
  });

  test('should update $balancesBuffer on $subAccounts change ', async () => {
    const subAccounts = { '0x01': { 2: [TEST_ACCOUNTS[0]] }, '0x02': { 2: [TEST_ACCOUNTS[1]] } };
    const newBalances = [
      { id: 1, chainId: '0x01', accountId: TEST_ACCOUNTS[0] },
      { id: 2, chainId: '0x02', accountId: TEST_ACCOUNTS[1] },
    ] as unknown as Balance[];

    jest.spyOn(storageService.balances, 'readAll').mockResolvedValue(newBalances);
    jest.spyOn(storageService.balances, 'insertAll').mockResolvedValue([]);

    const scope = fork();

    const action = allSettled(balanceSubModel.__$subAccounts, { scope, params: subAccounts });

    await jest.runAllTimersAsync();
    await action;

    expect(scope.getState(balanceModel.$balancesBuffer)).toEqual(newBalances);
  });

  test('should unsub $subscriptions for disconnected $connectionStatuses ', async () => {
    const connections = {
      '0x01': ConnectionStatus.DISCONNECTED,
      '0x02': ConnectionStatus.DISCONNECTED,
    };
    const ubsubs = Array.from({ length: 6 }, () => [jest.fn()]);
    const subscriptions = {
      '0x01': { 1: [ubsubs[0], ubsubs[1]] },
      '0x02': { 1: [ubsubs[2], ubsubs[3]] },
      '0x03': { 1: [ubsubs[4], ubsubs[5]] },
    };

    const scope = fork({
      values: new Map().set(balanceSubModel.__$subscriptions, subscriptions),
    });

    const action = allSettled(networkModel.$connectionStatuses, { scope, params: connections });

    await jest.runAllTimersAsync();
    await action;

    ubsubs.slice(0, 4).forEach(([unsubFn]) => expect(unsubFn).toHaveBeenCalled());
    expect(scope.getState(balanceSubModel.__$subscriptions)).toEqual({
      ...subscriptions,
      '0x01': undefined,
      '0x02': undefined,
    });
  });

  test('should sub $subscriptions for connected $connectionStatuses ', async () => {
    jest.spyOn(balanceService, 'subscribeBalances').mockResolvedValue([noop]);
    jest.spyOn(balanceService, 'subscribeLockBalances').mockResolvedValue([noop]);

    const connections = {
      '0x01': ConnectionStatus.CONNECTED,
      '0x02': ConnectionStatus.CONNECTED,
      '0x03': ConnectionStatus.CONNECTED,
    };
    const subscriptions = {
      '0x01': undefined,
      '0x02': undefined,
      '0x03': { 1: [[noop], [noop]] },
    };
    const subAccounts = {
      '0x01': { 1: [TEST_ACCOUNTS[0]] },
      '0x02': { 1: [TEST_ACCOUNTS[1]] },
      '0x03': { 1: [TEST_ACCOUNTS[2]] },
    };
    const apis = { '0x01': {}, '0x02': {}, '0x03': {} };

    const scope = fork({
      values: new Map()
        .set(balanceSubModel.__$subscriptions, subscriptions)
        .set(balanceSubModel.__$subAccounts, subAccounts)
        .set(networkModel.$chains, chains)
        .set(networkModel.$apis, apis),
    });

    const action = allSettled(networkModel.$connectionStatuses, { scope, params: connections });

    await jest.runAllTimersAsync();
    await action;

    expect(scope.getState(balanceSubModel.__$subscriptions)).toEqual({
      ...subscriptions,
      '0x01': { 1: [[noop], [noop]] },
      '0x02': { 1: [[noop], [noop]] },
    });
  });
});
