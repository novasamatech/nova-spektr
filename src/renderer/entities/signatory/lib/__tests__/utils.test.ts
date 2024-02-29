import { Account, Wallet, WalletType } from '@shared/core';
import { singnatoryUtils } from '../utils';

describe('entities/signatory/lib/utils', () => {
  test('should get signatory wallet', () => {
    const wallets = [
      {
        id: '1',
        type: WalletType.POLKADOT_VAULT,
        name: 'Correct wallet',
      },
      {
        id: '2',
        name: 'Incorrect wallet',
      },
    ] as unknown as Wallet[];

    const accounts = [
      {
        accountId: '0x01',
        walletId: '1',
      },
    ] as unknown as Account[];

    const signatory = singnatoryUtils.getSignatoryWallet(wallets, accounts, '0x01');

    expect(signatory).toEqual({
      id: '1',
      type: WalletType.POLKADOT_VAULT,
      name: 'Correct wallet',
    });
  });
});
