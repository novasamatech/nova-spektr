import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import { Asset } from '@renderer/domain/asset';
import { TEST_PUBLIC_KEY } from '@renderer/shared/utils/constants';
import InitOperation from './InitOperation';
import { ChainId } from '@renderer/domain/shared-kernel';

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

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getLiveAccounts: () => [],
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

describe('screens/Staking/Bond/InitOperation', () => {
  const defaultProps = {
    api: {} as ApiPromise,
    chainId: '0x123' as ChainId,
    accountIds: ['1'],
    asset: { assetId: 1, symbol: 'DOT', precision: 10 } as Asset,
    onResult: noop,
  };

  test('should render component', async () => {
    await act(async () => {
      render(<InitOperation {...defaultProps} />);
    });

    const input = screen.getByPlaceholderText('staking.bond.amountPlaceholder');
    const destination = screen.getByText('staking.bond.rewardsDestinationTitle');
    const button = screen.getByText('staking.bond.continueButton');
    expect(input).toBeInTheDocument();
    expect(destination).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });
});
