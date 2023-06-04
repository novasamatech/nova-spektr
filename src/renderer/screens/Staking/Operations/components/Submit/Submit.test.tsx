import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import noop from 'lodash/noop';

import { HexString } from '@renderer/domain/shared-kernel';
import { Asset } from '@renderer/domain/asset';
import { RewardsDestination } from '@renderer/domain/stake';
import { Transaction } from '@renderer/domain/transaction';
import { TEST_ADDRESS } from '@renderer/shared/utils/constants';
import { Submit } from './Submit';

jest.mock('@renderer/components/ui');

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('@renderer/context/ConfirmContext', () => ({
  useConfirmContext: jest.fn(() => ({
    confirm: jest.fn().mockResolvedValue(false),
  })),
}));

jest.mock('@renderer/services/transaction/transactionService', () => ({
  useTransaction: jest.fn().mockReturnValue({
    submitAndWatchExtrinsic: jest.fn((...args) => args[3](true)),
    getSignedExtrinsic: jest.fn(),
  }),
}));

jest.mock('@renderer/context/MatrixContext', () => ({
  useMatrix: jest.fn().mockReturnValue({
    matrix: {
      userIsLoggedIn: true,
      sendApprove: jest.fn(),
    },
  }),
}));

describe('screens/Staking/components/Submit', () => {
  const defaultProps = {
    api: {} as ApiPromise,
    transaction: {} as Transaction,
    asset: { assetId: 1, symbol: 'DOT', precision: 10 } as Asset,
    accounts: [],
    amount: '123',
    addressPrefix: 0,
    destination: { address: TEST_ADDRESS, type: RewardsDestination.TRANSFERABLE },
    unsignedTx: [{}, {}, {}] as UnsignedTransaction[],
    signatures: ['0x1', '0x2', '0x3'] as HexString[],
    onClose: noop,
  };

  test('should render component', async () => {
    await act(async () => {
      render(<Submit {...defaultProps} />, { wrapper: MemoryRouter });
    });

    const children = screen.getByText('children');
    const progress = screen.getByText('staking.confirmation.transactionProgress');
    const progressValue = screen.getByText('3 / 3');
    expect(children).toBeInTheDocument();
    expect(progress).toBeInTheDocument();
    expect(progressValue).toBeInTheDocument();
  });
});
