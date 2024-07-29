import { type ApiPromise } from '@polkadot/api';
import { allSettled, fork } from 'effector';

import { type Account, type ChainId, SigningType, type Transaction, type Wallet, WalletType } from '@shared/core';
import { networkModel } from '@entities/network';
import { transactionService } from '@entities/transaction';
import { walletModel } from '@entities/wallet';
import { submitModel } from '../submit-model';

jest.mock('@entities/transaction', () => ({
  transactionService: {
    signAndSubmit: jest.fn(),
  },
}));

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

describe('widgets/AddPureProxyModal/model/submit-model', () => {
  test('should submit extrinsic', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$apis, { '0x00': testApi }).set(walletModel.$wallets, [initiatorWallet]),
    });

    const store = {
      chainId: '0x00' as unknown as ChainId,
      account: { walletId: 1 } as unknown as Account,
      coreTxs: [{}] as Transaction[],
      wrappedTxs: [{}] as Transaction[],
      txPayloads: [{}] as Uint8Array[],
      signatures: ['0x00'],
      description: '',
    };

    await allSettled(submitModel.events.formInitiated, { scope, params: store });
    await allSettled(submitModel.events.submitStarted, { scope });

    expect(transactionService.signAndSubmit).toHaveBeenCalled();
  });
});
