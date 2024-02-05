import { fork, allSettled } from 'effector';

import { balanceSubModel } from '../balance-sub-model';
import { Wallet, ChainId, Chain, AccountType, Balance } from '@shared/core';
import { storageService } from '@shared/api/storage';
import { walletModel } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { TEST_ACCOUNTS } from '@shared/lib/utils';
import { balanceModel } from '@entities/balance';

describe('features/balances/subscription/model/balance-sub-model', () => {
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
    const chains = {
      '0x01': { name: 'My chain 1', chainId: '0x01' },
      '0x02': { name: 'My chain 2', chainId: '0x02' },
    } as unknown as Record<ChainId, Chain>;

    const scope = fork({});

    const actions = Promise.all([
      allSettled(walletModel.$wallets, { scope, params: [wallet] }),
      allSettled(networkModel.$chains, { scope, params: chains }),
    ]);

    await jest.runAllTimersAsync();
    await actions;

    expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual({ '0x01': { 1: [] }, '0x02': { 1: [] } });
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

  // test('should update $subscriptions for connected $connectionStatuses ', async () => {
  //   const scope = fork({});
  //
  //   await allSettled(balanceSubModel.events.balancesSubStarted, { scope });
  //   expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual([]);
  // });
  //
  // test('should update $subscriptions for $connectionStatuses ', async () => {
  //   const scope = fork({});
  //
  //   await allSettled(balanceSubModel.events.balancesSubStarted, { scope });
  //   expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual([]);
  // });
});
