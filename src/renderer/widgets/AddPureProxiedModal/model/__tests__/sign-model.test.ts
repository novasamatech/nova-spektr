import { allSettled, fork } from 'effector';

import { signModel } from '../sign-model';
import { networkModel } from '@entities/network';
import { walletModel } from '@entities/wallet';
import { Account, Chain } from '@shared/core';
import { Transaction } from '@entities/transaction';
import { initiatorWallet, signerWallet, testApi } from './mock';

describe('widgets/AddPureProxyModal/model/sign-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should fill data for sign model for multisig account', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(walletModel.$wallets, [initiatorWallet, signerWallet]),
    });

    const store = {
      chain: { chainId: '0x00' } as unknown as Chain,
      account: { walletId: 1 } as unknown as Account,
      signer: { walletId: 2 } as unknown as Account,
      transaction: {} as Transaction,
    };

    await allSettled(signModel.events.formInitiated, {
      scope,
      params: store,
    });

    expect(scope.getState(signModel.$api)).toEqual(testApi);
    expect(scope.getState(signModel.$signStore)).toEqual(store);
  });
});
