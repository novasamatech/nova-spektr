import { ApiPromise } from '@polkadot/api';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';
import { type EffectParams, type EffectResult, allSettled, fork } from 'effector';

import { balanceService } from '@/shared/api/balances';
import { storageService } from '@/shared/api/storage';
import { keys } from '@/shared/lib/utils';
import { accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { balanceSubUtils } from '../../lib/balance-sub-utils';
import { type SubscriptionKey } from '../../lib/types';
import { balanceSubModel } from '../balance-sub-model';

import { balanceSubMock } from './mocks/balance-sub-mock';

const createApi = () => {
  const registry = new TypeRegistry();
  const provider = new MockProvider(registry);
  return ApiPromise.create({
    provider,
    registry,
    throwOnConnect: true,
  });
};

const setupScope = () => {
  const subscribeAccountHandler = (
    subscriptions: EffectParams<typeof balanceSubModel.__test.subscribeAccountsFx>,
  ): EffectResult<typeof balanceSubModel.__test.subscribeAccountsFx> => {
    const result: Record<SubscriptionKey, VoidFunction> = {};
    for (const { chain, accountId } of subscriptions) {
      const key = balanceSubUtils.getSubscriptionKey(accountId, chain.chainId);
      result[key] = () => {};
    }

    return result;
  };

  const { chains, wallets, accountMocks } = balanceSubMock;
  const apis = keys(chains).reduce((acc, id) => ({ ...acc, [id]: createApi() }), {});
  const scope = fork({
    values: [
      [networkModel.$apis, apis],
      [networkModel.$chains, chains],
      [accounts.__test.$list, accountMocks],
      [walletModel.__test.$rawWallets, wallets],
    ],
    handlers: [[balanceSubModel.__test.subscribeAccountsFx, subscribeAccountHandler]],
  });

  return scope;
};

describe('balance sub model', () => {
  const balanceSpy = jest.fn();
  const lockSpy = jest.fn();
  const balanceSpyPromise = Promise.resolve(balanceSpy);
  const lockSpyPromise = Promise.resolve(lockSpy);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    jest.spyOn(storageService.balances, 'readAll').mockResolvedValue([]);
    jest.spyOn(storageService.balances, 'insertAll').mockResolvedValue([]);

    jest.spyOn(balanceService, 'subscribeBalances').mockReturnValue([balanceSpyPromise]);
    jest.spyOn(balanceService, 'subscribeLockBalances').mockReturnValue([lockSpyPromise]);
  });

  test('should set $subscribedAccounts', async () => {
    const scope = setupScope();

    await allSettled(balanceSubModel.subscribeKnownAccounts, { scope, params: balanceSubMock.accountMocks });

    expect(scope.getState(balanceSubModel.__test.$subscribedAccounts)).toEqual(balanceSubMock.accountMocks);
  });
});
