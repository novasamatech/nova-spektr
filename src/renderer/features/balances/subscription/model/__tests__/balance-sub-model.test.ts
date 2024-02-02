import { fork, allSettled } from 'effector';

import { balanceSubModel } from '../balance-sub-model';

describe('features/balances/subscription/model/balance-sub-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  // TODO: does something?
  test('should do something on balancesSubStarted', async () => {
    const scope = fork({});

    await allSettled(balanceSubModel.events.balancesSubStarted, { scope });
    expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual([]);
  });

  test('should update $subAccounts on walletToUnsubSet', async () => {
    const scope = fork({});

    await allSettled(balanceSubModel.events.balancesSubStarted, { scope });
    expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual([]);
  });

  // test('should update $subAccounts on $previousWallet change', async () => {
  //   const scope = fork({});
  //
  //   await allSettled(balanceSubModel.events.balancesSubStarted, { scope });
  //   expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual([]);
  // });

  // test('should update $subAccounts on walletToUnsubSet', async () => {
  //   const scope = fork({});
  //
  //   await allSettled(balanceSubModel.events.balancesSubStarted, { scope });
  //   expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual([]);
  // });

  // test('should update $subAccounts on $activeWallet change', async () => {
  //   const scope = fork({});
  //
  //   await allSettled(balanceSubModel.events.balancesSubStarted, { scope });
  //   expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual([]);
  // });

  // test('should update $balancesBuffer on $subAccounts change ', async () => {
  //   const scope = fork({});
  //
  //   await allSettled(balanceSubModel.events.balancesSubStarted, { scope });
  //   expect(scope.getState(balanceSubModel.__$subAccounts)).toEqual([]);
  // });

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
