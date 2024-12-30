import { allSettled, fork } from 'effector';

import { type Account, type Chain } from '@/shared/core';
import * as networkDomain from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { confirmModel } from '../confirm-model';

import { accounts, initiatorWallet, signerWallet, testApi } from './mock';

describe('Create flexible multisig wallet confirm-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should fill data for confirm model for multisig account', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$apis, { '0x00': testApi })
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet])
        .set(networkDomain.accounts.__test.$list, accounts),
    });

    const store = {
      chain: { chainId: '0x00' } as unknown as Chain,
      account: { walletId: signerWallet.id } as unknown as Account,
      signer: { walletId: signerWallet.id } as unknown as Account,
      threshold: 2,
      name: 'multisig name',
      fee: '',
      multisigDeposit: '',
    };

    await allSettled(confirmModel.events.formInitiated, { scope, params: store });

    expect(scope.getState(confirmModel.$api)).toEqual(testApi);
    expect(scope.getState(confirmModel.$confirmStore)).toEqual(store);
    expect(scope.getState(confirmModel.$signerWallet)).toEqual(signerWallet);
  });
});
