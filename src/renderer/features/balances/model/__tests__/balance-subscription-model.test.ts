import { fork, allSettled } from 'effector';

import { balanceSubscriptionModel } from '../balance-subscription-model';

describe('features/balances/model/balance-subscription-model', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should not start balance subscriptions for empty networks and accounts', async () => {
    const scope = fork();

    await allSettled(balanceSubscriptionModel.events.balancesSubscribed, { scope });

    expect(scope.getState(balanceSubscriptionModel.$subscriptions)).toEqual({});
  });
});
