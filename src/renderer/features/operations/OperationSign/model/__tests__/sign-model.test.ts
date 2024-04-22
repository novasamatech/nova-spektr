import { allSettled, fork } from 'effector';
import { ApiPromise } from '@polkadot/api';

import { networkModel } from '@entities/network';
import { walletModel } from '@entities/wallet';
import { Account, Chain, SigningType, Wallet, WalletType } from '@shared/core';
import { Transaction } from '@entities/transaction';
import { signModel } from '../sign-model';

const testApi = {
  key: 'test-api',
} as unknown as ApiPromise;

const initiatorWallet = {
  id: 1,
  name: 'Wallet',
  isActive: true,
  type: WalletType.POLKADOT_VAULT,
  signingType: SigningType.POLKADOT_VAULT,
} as Wallet;

const signerWallet = {
  id: 2,
  name: 'Signer Wallet',
  isActive: true,
  type: WalletType.POLKADOT_VAULT,
  signingType: SigningType.POLKADOT_VAULT,
} as Wallet;

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
      accounts: [{ walletId: 1 }] as unknown as BaseAccount[],
      signer: { walletId: 2 } as unknown as Account,
      transactions: [{}] as Transaction[],
    };

    await allSettled(signModel.events.formInitiated, { scope, params: store });

    expect(scope.getState(signModel.$api)).toEqual(testApi);
    expect(scope.getState(signModel.$signStore)).toEqual(store);
  });
});
