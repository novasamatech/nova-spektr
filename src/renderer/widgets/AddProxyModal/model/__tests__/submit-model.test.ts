import { allSettled, fork } from 'effector';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { submitModel } from '../submit-model';
import { networkModel } from '@entities/network';
import { walletModel } from '@entities/wallet';
import { Account, Chain } from '@shared/core';
import { Transaction, getSignedExtrinsic, submitAndWatchExtrinsic } from '@entities/transaction';
import { SubmitStep } from '../../lib/types';
import { initiatorWallet, testApi } from './mock';

jest.mock('@entities/transaction', () => {
  return {
    ...jest.requireActual('@entities/transaction'),
    getSignedExtrinsic: jest.fn(),
    submitAndWatchExtrinsic: jest.fn(),
  };
});

describe('widgets/AddPureProxyModal/model/submit-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should fill data for submit model for polkadot vault account', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, {
          '0x00': testApi,
        })
        .set(walletModel.$wallets, [initiatorWallet]),
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

    expect(getSignedExtrinsic).toBeCalled();
    expect(submitAndWatchExtrinsic).toBeCalled();
  });
});
