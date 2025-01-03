import { type ApiPromise } from '@polkadot/api';
import { allSettled, fork } from 'effector';

import { type Account, type Chain, SigningType, type Transaction, type Wallet, WalletType } from '@/shared/core';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { type SigningPayload } from '../../lib/types';
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
        .set(walletModel.__test.$rawWallets, [initiatorWallet, signerWallet]),
    });

    const payload = {
      chain: { chainId: '0x00' } as unknown as Chain,
      account: { walletId: 1 } as unknown as Account,
      signatory: { walletId: 2 } as unknown as Account,
      transaction: {} as Transaction,
    } as SigningPayload;

    await allSettled(signModel.events.formInitiated, { scope, params: { signingPayloads: [payload] } });

    expect(scope.getState(signModel.$apis)).toEqual({ '0x00': testApi });
    expect(scope.getState(signModel.$signStore)).toEqual({ signingPayloads: [payload] });
  });
});
