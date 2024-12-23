import { type Wallet, WalletType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { signatoryUtils } from '../utils';

describe('entities/signatory/lib/onChainUtils', () => {
  test('should get signatory wallet', () => {
    const wallets = [
      {
        id: '1',
        name: 'Incorrect wallet',
        accounts: [{ walletId: '1', accountId: '0x02' }],
      },
      {
        id: '2',
        type: WalletType.POLKADOT_VAULT,
        name: 'Correct wallet',
        accounts: [{ walletId: '2', accountId: '0x01' }],
      },
    ] as unknown as Wallet[];

    const signatory = signatoryUtils.getSignatoryWallet(wallets, '0x01' as AccountId);

    expect(signatory).toEqual(wallets[1]);
  });
});
