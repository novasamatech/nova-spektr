import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import { Asset } from '@renderer/domain/asset';
import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';
import InitOperation from './InitOperation';
import { ChainId } from '@renderer/domain/shared-kernel';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getLiveAccounts: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
  }),
}));

jest.mock('@renderer/services/balance/balanceService', () => ({
  useBalance: jest.fn().mockReturnValue({
    getLiveBalance: jest.fn().mockReturnValue({
      assetId: 1,
      chainId: '0x123',
      accountId: TEST_ACCOUNT_ID,
      free: '10',
      frozen: [{ type: 'test', amount: '1' }],
    }),
    getLiveAssetBalances: jest.fn().mockReturnValue([
      {
        assetId: 1,
        chainId: '0x123',
        accountId: TEST_ACCOUNT_ID,
        free: '10',
        frozen: [{ type: 'test', amount: '1' }],
      },
    ]),
  }),
}));

jest.mock('../../components', () => ({
  OperationForm: ({ children }: any) => {
    return (
      <div>
        <p>operationForm</p>
        {children()}
      </div>
    );
  },
}));

describe('screens/Staking/Unstake/InitOperation', () => {
  const defaultProps = {
    api: {} as ApiPromise,
    chainId: '0x123' as ChainId,
    addressPrefix: 0,
    staking: {},
    accounts: [],
    asset: { assetId: 1, symbol: 'DOT', precision: 10 } as Asset,
    onResult: noop,
  };

  test('should render component', async () => {
    await act(async () => {
      render(<InitOperation {...defaultProps} />);
    });

    const form = screen.getByText('operationForm');
    const durationHint = screen.getByText(/staking.unstake.durationHint/);
    const noRewardsHint = screen.getByText('staking.unstake.noRewardsHint');
    const redeemHint = screen.getByText('staking.unstake.redeemHint');
    expect(form).toBeInTheDocument();
    expect(durationHint).toBeInTheDocument();
    expect(noRewardsHint).toBeInTheDocument();
    expect(redeemHint).toBeInTheDocument();
  });
});
