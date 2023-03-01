import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { TEST_PUBLIC_KEY } from '@renderer/shared/utils/constants';
import InitOperation from './InitOperation';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn().mockReturnValue({
    getLiveWallets: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('@renderer/services/transaction/transactionService', () => ({
  useTransaction: jest.fn().mockReturnValue({
    getTransactionFee: jest.fn().mockResolvedValue('1'),
  }),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getLiveAccounts: () => [
      {
        id: '1',
        name: 'Test Wallet',
        accountId: '1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ',
        publicKey: TEST_PUBLIC_KEY,
      },
    ],
  }),
}));

jest.mock('@renderer/services/staking/validatorsService', () => ({
  useValidators: jest.fn().mockReturnValue({
    getMaxValidators: () => 4,
  }),
}));

jest.mock('@renderer/services/balance/balanceService', () => ({
  useBalance: jest.fn().mockReturnValue({
    getBalance: jest.fn().mockReturnValue({
      assetId: 1,
      chainId: '0x123',
      publicKey: TEST_PUBLIC_KEY,
      free: '10',
      frozen: [{ type: 'test', amount: '1' }],
    }),
    getLiveAssetBalances: jest.fn().mockReturnValue([
      {
        assetId: 1,
        chainId: '0x123',
        publicKey: TEST_PUBLIC_KEY,
        free: '10',
        frozen: [{ type: 'test', amount: '1' }],
      },
    ]),
  }),
}));

describe('screens/Destination/InitOperation', () => {
  const asset = { assetId: 1, symbol: 'DOT', precision: 10 } as Asset;

  test('should render component', async () => {
    await act(async () => {
      render(
        <InitOperation api={{} as ApiPromise} chainId="0x123" accountIds={['1']} asset={asset} onResult={() => {}} />,
      );
    });

    const destination = screen.getByText('staking.bond.rewardsDestinationTitle');
    const button = screen.getByText('staking.bond.continueButton');
    expect(destination).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });
});
