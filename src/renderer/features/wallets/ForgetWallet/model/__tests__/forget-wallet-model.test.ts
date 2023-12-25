import { allSettled, fork } from 'effector';

import { SigningType, WalletType } from '@shared/core';
import { forgetWalletModel } from '../forget-wallet-model';

jest.mock('@entities/balance', () => ({
  useBalanceService: () => ({
    deleteBalances: jest.fn(),
  }),
}));

const wallet = {
  id: 2,
  name: 'My second wallet',
  isActive: false,
  type: WalletType.WATCH_ONLY,
  signingType: SigningType.WATCH_ONLY,
};

describe('features/ForgetModel', () => {
  test('should call success calback after wallet delete', async () => {
    const spyCallback = jest.fn();
    const scope = fork({});

    await allSettled(forgetWalletModel.events.callbacksChanged, { scope, params: { onDeleteFinished: spyCallback } });
    await allSettled(forgetWalletModel.events.forgetWallet, { scope, params: wallet });

    expect(spyCallback).toBeCalled();
  });
});
