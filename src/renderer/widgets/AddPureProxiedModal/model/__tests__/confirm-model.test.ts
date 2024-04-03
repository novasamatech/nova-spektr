import { allSettled, fork } from 'effector';

import { confirmModel } from '../confirm-model';
import { networkModel } from '@entities/network';
import { walletModel } from '@entities/wallet';
import { Account, Chain } from '@shared/core';
import { Transaction } from '@entities/transaction';
import { initiatorWallet, signerWallet, testApi } from './mock';

describe('widgets/AddPureProxyModal/model/confirm-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should fill data for confirm model for multisig account', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(walletModel.$wallets, [initiatorWallet, signerWallet]),
    });

    const store = {
      chain: { chainId: '0x00' } as unknown as Chain,
      account: { walletId: 1 } as unknown as Account,
      signatory: { walletId: 2 } as unknown as Account,
      description: '',
      transaction: {} as Transaction,
      proxyDeposit: '0',
    };

    await allSettled(confirmModel.events.formInitiated, { scope, params: store });

    expect(scope.getState(confirmModel.$api)).toEqual(testApi);
    expect(scope.getState(confirmModel.$confirmStore)).toEqual(store);
    expect(scope.getState(confirmModel.$initiatorWallet)).toEqual(initiatorWallet);
    expect(scope.getState(confirmModel.$signerWallet)).toEqual(signerWallet);
  });

  test('should fill data for confirm model for polkadot vault account', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$apis, { '0x00': testApi }).set(walletModel.$wallets, [initiatorWallet]),
    });

    const store = {
      chain: { chainId: '0x00' } as unknown as Chain,
      account: { walletId: 1 } as unknown as Account,
      description: '',
      transaction: {} as Transaction,
      proxyDeposit: '0',
    };

    await allSettled(confirmModel.events.formInitiated, { scope, params: store });

    expect(scope.getState(confirmModel.$api)).toEqual(testApi);
    expect(scope.getState(confirmModel.$confirmStore)).toEqual(store);
    expect(scope.getState(confirmModel.$initiatorWallet)).toEqual(initiatorWallet);
    expect(scope.getState(confirmModel.$signerWallet)).toEqual(initiatorWallet);
  });
});
