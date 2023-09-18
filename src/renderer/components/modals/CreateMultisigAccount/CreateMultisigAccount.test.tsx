import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { fork } from 'effector';
import noop from 'lodash/noop';

import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';
import { contactModel } from '@renderer/entities/contact';
import { CreateMultisigAccount } from './CreateMultisigAccount';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
  useMatrix: jest.fn().mockReturnValue({
    isLoggedIn: true,
    matrix: {
      createRoom: jest.fn(),
      userId: 'userId',
    },
  }),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('@renderer/entities/account', () => ({
  useAccount: jest.fn().mockReturnValue({
    addAccount: jest.fn(),
    setActiveAccount: jest.fn(),
    getAccounts: jest.fn().mockResolvedValue([{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }]),
  }),
}));

jest.mock('@renderer/entities/wallet', () => ({
  useWallet: jest.fn().mockReturnValue({
    getWallets: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock('@renderer/entities/network', () => ({
  chainsService: {
    getChainsData: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@renderer/components/modals/MatrixModal/MatrixModal', () => ({
  MatrixModal: () => <span>matrixModal</span>,
}));

jest.mock('@renderer/entities/transaction', () => ({
  OperationResult: () => <span>operationResult</span>,
}));

jest.mock('./components', () => ({
  WalletForm: () => <span>walletForm</span>,
  SelectSignatories: () => <span>selectSignatories</span>,
  ConfirmSignatories: () => <span>confirmSignatories</span>,
}));

describe('screen/CreateMultisigAccount', () => {
  test('should render component', async () => {
    fork({
      values: new Map().set(contactModel.$contacts, []),
    });

    await act(async () => {
      render(<CreateMultisigAccount isOpen={true} onClose={noop} />, { wrapper: MemoryRouter });
    });
    const text = screen.getByText('createMultisigAccount.title');
    const form = screen.getByText('walletForm');
    const select = screen.getByText('selectSignatories');
    expect(text).toBeInTheDocument();
    expect(form).toBeInTheDocument();
    expect(select).toBeInTheDocument();
  });
});
