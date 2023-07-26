import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import { Asset } from '@renderer/entities/asset';
import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';
import InitOperation from './InitOperation';
import { ChainId } from '@renderer/domain/shared-kernel';
import { Account } from '@renderer/entities/account';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/entities/staking', () => ({
  useStakingData: jest.fn().mockReturnValue({
    subscribeStaking: jest.fn(),
    getMinNominatorBond: jest.fn().mockResolvedValue('1000000000000'),
  }),
}));

jest.mock('@renderer/entities/account', () => ({
  ...jest.requireActual('@renderer/entities/account'),
  useAccount: jest.fn().mockReturnValue({
    getLiveAccounts: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
  }),
}));

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

jest.mock('../../../Overview/components', () => ({ UnstakingDuration: () => 'unstaking_duration' }));
jest.mock('../../components', () => ({
  OperationForm: ({ children }: any) => {
    return (
      <div>
        <p>operationForm</p>
        {children({ invalidBalance: false, invalidFee: false, invalidDeposit: false })}
      </div>
    );
  },
}));

describe('screens/Staking/Unstake/InitOperation', () => {
  const defaultProps = {
    api: {} as ApiPromise,
    chainId: '0x123' as ChainId,
    addressPrefix: 0,
    accounts: [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }] as unknown as Account[],
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
