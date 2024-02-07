import { fork, allSettled, Scope } from 'effector';

import { Wallet, ConnectionStatus } from '@shared/core';
import { storageService } from '@shared/api/storage';
import { walletModel } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { balanceService } from '@shared/api/balances';
import { balanceSubMock } from './mocks/balance-sub-mock';
import { balanceSubModel } from '../balance-sub-model';

describe('features/balances/subscription/model/balance-sub-model', () => {
  const { wallets, newWallets, accounts } = balanceSubMock;

  const setupInitialState = async (scope: Scope) => {
    const { chains, wallets, accounts } = balanceSubMock;

    const actions = Promise.all([
      allSettled(networkModel.$chains, { scope, params: chains }),
      allSettled(walletModel.$accounts, { scope, params: accounts }),
      allSettled(walletModel.$wallets, { scope, params: wallets }),
    ]);

    await jest.runAllTimersAsync();
    await actions;
  };

  const balanceSpy = jest.fn();
  const lockSpy = jest.fn();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    jest.spyOn(storageService.balances, 'readAll').mockResolvedValue([]);
    jest.spyOn(storageService.balances, 'insertAll').mockResolvedValue([]);

    jest.spyOn(balanceService, 'subscribeBalances').mockResolvedValue([balanceSpy]);
    jest.spyOn(balanceService, 'subscribeLockBalances').mockResolvedValue([lockSpy]);
  });

  // test('should set initial $subAccounts on $chains & $activeWallet first change', async () => {
  //   const scope = fork();
  //   await setupInitialState(scope);
  //
  //   expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual({
  //     '0x01': { [wallets[0].id]: [accounts[0].accountId] },
  //     '0x02': { [wallets[0].id]: [accounts[0].accountId, accounts[1].accountId] },
  //   });
  // });
  //
  // test('should remove $subAccounts on walletToUnsubSet', async () => {
  //   const subAccounts = {
  //     '0x01': { [wallets[0].id]: [], [wallets[1].id]: [] },
  //     '0x02': { [wallets[0].id]: [], [wallets[1].id]: [] },
  //   };
  //
  //   const scope = fork({
  //     values: new Map().set(balanceSubModel.__$subAccounts, subAccounts),
  //   });
  //
  //   const action = allSettled(balanceSubModel.events.walletToUnsubSet, { scope, params: wallets[0] });
  //
  //   await jest.runAllTimersAsync();
  //   await action;
  //
  //   expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual({
  //     '0x01': { [wallets[1].id]: [] },
  //     '0x02': { [wallets[1].id]: [] },
  //   });
  // });
  //
  // test('should update $subAccounts on $activeWallet & $previousWallet change', async () => {
  //   const scope = fork();
  //   await setupInitialState(scope);
  //
  //   const action = allSettled(walletModel.$wallets, { scope, params: newWallets });
  //
  //   await jest.runAllTimersAsync();
  //   await action;
  //
  //   expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual({
  //     '0x01': { [wallets[1].id]: [accounts[2].accountId] },
  //     '0x02': { [wallets[1].id]: [accounts[2].accountId, accounts[3].accountId] },
  //   });
  // });
  //
  // test('should add $subAccounts on walletToSubSet', async () => {
  //   const scope = fork();
  //   await setupInitialState(scope);
  //
  //   expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual({
  //     '0x01': { [wallets[0].id]: [accounts[0].accountId] },
  //     '0x02': { [wallets[0].id]: [accounts[0].accountId, accounts[1].accountId] },
  //   });
  //
  //   const action = allSettled(balanceSubModel.events.walletToSubSet, { scope, params: wallets[1] });
  //
  //   await jest.runAllTimersAsync();
  //   await action;
  //
  //   expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual({
  //     '0x01': { [wallets[0].id]: [accounts[0].accountId], [wallets[1].id]: [accounts[2].accountId] },
  //     '0x02': {
  //       [wallets[0].id]: [accounts[0].accountId, accounts[1].accountId],
  //       [wallets[1].id]: [accounts[2].accountId, accounts[3].accountId],
  //     },
  //   });
  // });
  //
  // test('should update $subscriptions on $activeWallet & $previousWallet change', async () => {
  //   const scope = fork({
  //     values: new Map().set(networkModel.$connectionStatuses, {
  //       '0x01': ConnectionStatus.CONNECTED,
  //       '0x02': ConnectionStatus.DISCONNECTED,
  //     }),
  //   });
  //   await setupInitialState(scope);
  //
  //   expect(balanceSpy).not.toHaveBeenCalled();
  //   expect(lockSpy).not.toHaveBeenCalled();
  //   expect(scope.getState(balanceSubModel.__$subscriptions)).toEqual({
  //     '0x01': { [wallets[0].id]: [[balanceSpy], [lockSpy]] },
  //     '0x02': undefined,
  //   });
  //
  //   const action = allSettled(walletModel.$wallets, { scope, params: newWallets });
  //
  //   await jest.runAllTimersAsync();
  //   await action;
  //
  //   expect(balanceSpy).toHaveBeenCalledTimes(1);
  //   expect(lockSpy).toHaveBeenCalledTimes(1);
  //   expect(scope.getState(balanceSubModel.__$subscriptions)).toEqual({
  //     '0x01': { [wallets[1].id]: [[balanceSpy], [lockSpy]] },
  //     '0x02': undefined,
  //   });
  // });
  //
  // test('should remove $subscriptions on walletToUnsubSet', async () => {
  //   const scope = fork({
  //     values: new Map().set(networkModel.$connectionStatuses, {
  //       '0x01': ConnectionStatus.CONNECTED,
  //       '0x02': ConnectionStatus.CONNECTED,
  //     }),
  //   });
  //   await setupInitialState(scope);
  //
  //   expect(scope.getState(balanceSubModel.__$subscriptions)).toEqual({
  //     '0x01': { [wallets[0].id]: [[balanceSpy], [lockSpy]] },
  //     '0x02': { [wallets[0].id]: [[balanceSpy], [lockSpy]] },
  //   });
  //
  //   const action = allSettled(balanceSubModel.events.walletToUnsubSet, { scope, params: wallets[0] });
  //
  //   await jest.runAllTimersAsync();
  //   await action;
  //
  //   expect(balanceSpy).toHaveBeenCalledTimes(2);
  //   expect(lockSpy).toHaveBeenCalledTimes(2);
  //   expect(scope.getState(balanceSubModel.__$subscriptions)).toEqual({ '0x01': undefined, '0x02': undefined });
  // });
  //
  // test('should update $balancesBuffer on $subAccounts change ', async () => {
  //   const subAccounts = {
  //     '0x01': { [wallets[1].id]: [accounts[2].accountId] },
  //     '0x02': { [wallets[1].id]: [accounts[2].accountId, accounts[3].accountId] },
  //   };
  //
  //   const newBalances = [
  //     { id: 1, chainId: '0x01', accountId: accounts[2].accountId },
  //     { id: 2, chainId: '0x02', accountId: accounts[3].accountId },
  //   ] as unknown as Balance[];
  //
  //   jest.spyOn(storageService.balances, 'readAll').mockResolvedValue(newBalances);
  //
  //   const scope = fork();
  //
  //   const action = allSettled(balanceSubModel.__$subAccounts, { scope, params: subAccounts });
  //
  //   await jest.runAllTimersAsync();
  //   await action;
  //
  //   expect(scope.getState(balanceModel.$balancesBuffer)).toEqual(newBalances);
  // });
  //
  // test('should update $subscriptions for disconnected $connectionStatuses ', async () => {
  //   const scope = fork({
  //     values: new Map().set(balanceSubModel.__$subscriptions, {
  //       '0x01': { [wallets[0].id]: [[balanceSpy], [lockSpy]] },
  //       '0x02': { [wallets[0].id]: [[balanceSpy], [lockSpy]] },
  //     }),
  //   });
  //
  //   const action = allSettled(networkModel.$connectionStatuses, {
  //     scope,
  //     params: {
  //       '0x01': ConnectionStatus.DISCONNECTED,
  //       '0x02': ConnectionStatus.CONNECTED,
  //     },
  //   });
  //
  //   await jest.runAllTimersAsync();
  //   await action;
  //
  //   expect(balanceSpy).toHaveBeenCalledTimes(1);
  //   expect(lockSpy).toHaveBeenCalledTimes(1);
  //   expect(scope.getState(balanceSubModel.__$subscriptions)).toEqual({
  //     '0x01': undefined,
  //     '0x02': { [wallets[0].id]: [[balanceSpy], [lockSpy]] },
  //   });
  // });

  // test('should update $subscriptions for connected $connectionStatuses ', async () => {
  //   const scope = fork();
  //   await setupInitialState(scope);
  //
  //   expect(scope.getState(balanceSubModel.__$subscriptions)).toEqual({});
  //
  //   const action = allSettled(networkModel.$connectionStatuses, {
  //     scope,
  //     params: {
  //       '0x01': ConnectionStatus.CONNECTED,
  //       '0x02': ConnectionStatus.CONNECTED,
  //     },
  //   });
  //
  //   await jest.runAllTimersAsync();
  //   await action;
  //
  //   expect(scope.getState(balanceSubModel.__$subscriptions)).toEqual({
  //     '0x01': { [wallets[0].id]: [[balanceSpy], [lockSpy]] },
  //     '0x02': { [wallets[0].id]: [[balanceSpy], [lockSpy]] },
  //   });
  // });

  test('should update $subscriptions on walletToSubSet', async () => {
    const scope_1 = fork({
      values: new Map().set(networkModel.$connectionStatuses, {
        '0x01': ConnectionStatus.DISCONNECTED,
        '0x02': ConnectionStatus.CONNECTED,
      }),
    });
    await setupInitialState(scope_1);

    expect(scope_1.getState(balanceSubModel.__$subscriptions)).toEqual({
      '0x01': undefined,
      '0x02': { [wallets[0].id]: [[balanceSpy], [lockSpy]] },
    });

    const action = allSettled(balanceSubModel.events.walletToSubSet, { scope: scope_1, params: wallets[1] });

    await jest.runAllTimersAsync();
    await action;

    expect(balanceSpy).not.toHaveBeenCalled();
    expect(lockSpy).not.toHaveBeenCalled();
    expect(scope_1.getState(balanceSubModel.__$subscriptions)).toEqual({
      '0x01': undefined,
      '0x02': { [wallets[0].id]: [[balanceSpy], [lockSpy]], [wallets[1].id]: [[balanceSpy], [lockSpy]] },
    });
  });
});
