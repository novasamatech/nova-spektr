import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';
import InitOperation from './InitOperation';
import type { Account, Asset, ChainId } from '@renderer/shared/core';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/entities/staking', () => ({
  useStakingData: jest.fn().mockReturnValue({
    subscribeStaking: jest.fn(),
  }),
  useEra: jest.fn().mockReturnValue({
    subscribeActiveEra: jest.fn(),
  }),
}));

// jest.mock('@renderer/entities/account', () => ({
//   ...jest.requireActual('@renderer/entities/account'),
//   useAccount: jest.fn().mockReturnValue({
//     getLiveAccounts: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
//   }),
// }));

jest.mock('@renderer/entities/asset', () => ({
  useBalance: jest.fn().mockReturnValue({
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
  AssetBalance: () => <span>balance</span>,
}));

jest.mock('../../components', () => ({
  OperationForm: ({ header }: any) => {
    return (
      <div>
        <p>operationForm</p>
        {header({ invalidBalance: false, invalidFee: false, invalidDeposit: false })}
      </div>
    );
  },
}));

describe('pages/Staking/Redeem/InitOperation', () => {
  const defaultProps = {
    api: {} as ApiPromise,
    chainId: '0x123' as ChainId,
    addressPrefix: 0,
    accounts: [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID, walletId: 1 }] as unknown as Account[],
    asset: { assetId: 1, symbol: 'DOT', precision: 10 } as Asset,
    onResult: noop,
  };

  test('should render component', async () => {
    await act(async () => {
      render(<InitOperation {...defaultProps} />);
    });

    const form = screen.getByText('operationForm');
    const address = screen.getByText('Test Wallet');
    expect(form).toBeInTheDocument();
    expect(address).toBeInTheDocument();
  });
});
