import { allSettled, fork } from 'effector';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { submitModel } from '../submit-model';
import { networkModel } from '@entities/network';
import { walletModel } from '@entities/wallet';
import { Account, Chain } from '@shared/core';
import { Transaction } from '@entities/transaction';
import { SubmitStep } from '../../lib/types';
import { initiatorWallet, testApi } from './mock';

describe('widgets/AddPureProxyModal/model/confirm-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should fill data for confirm model for polkadot vault account', async () => {
    const getSignedExtrinsicMock = jest.fn();
    const submitExtrinsicMock = jest.fn();

    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, {
          '0x00': testApi,
        })
        .set(walletModel.$wallets, [initiatorWallet]),
      handlers: new Map()
        .set(submitModel.__tests__.getSignedExtrinsicFx, getSignedExtrinsicMock)
        .set(submitModel.__tests__.submitExtrinsicFx, submitExtrinsicMock),
    });

    const store = {
      chain: { chainId: '0x00' } as unknown as Chain,
      account: { walletId: 1 } as unknown as Account,
      description: '',
      transaction: {} as Transaction,
      unsignedTx: {} as UnsignedTransaction,
      signature: '0x00',
    };

    await allSettled(submitModel.events.formInitiated, {
      scope,
      params: store,
    });

    expect(scope.getState(submitModel.$submitStep)).toEqual({
      step: SubmitStep.LOADING,
      message: '',
    });
    expect(scope.getState(submitModel.$submitStore)).toEqual(store);

    await allSettled(submitModel.events.submitStarted, { scope });

    expect(getSignedExtrinsicMock).toBeCalled();
    expect(submitExtrinsicMock).toBeCalled();
  });
});
