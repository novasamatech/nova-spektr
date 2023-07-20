import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import noop from 'lodash/noop';

import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';
import { CreateMultisigAccount } from './CreateMultisigAccount';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    addAccount: jest.fn(),
    setActiveAccount: jest.fn(),
    getAccounts: jest.fn().mockResolvedValue([{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }]),
  }),
}));

jest.mock('@renderer/services/contact/contactService', () => ({
  useContact: jest.fn().mockReturnValue({
    getLiveContacts: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn().mockReturnValue({
    getWallets: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock('@renderer/services/network/chainsService', () => ({
  useChains: jest.fn().mockReturnValue({
    getChainsData: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock('@renderer/context/MatrixContext', () => ({
  useMatrix: jest.fn().mockReturnValue({
    isLoggedIn: true,
    matrix: {
      createRoom: jest.fn(),
      userId: 'userId',
    },
  }),
}));

jest.mock('@renderer/components/modals/MatrixModal/MatrixModal', () => ({
  MatrixModal: () => <span>matrixModal</span>,
}));

jest.mock('@renderer/components/common/OperationResult/OperationResult', () => ({
  OperationResult: () => <span>operationResult</span>,
}));

jest.mock('./components', () => ({
  WalletForm: () => <span>walletForm</span>,
  SelectSignatories: () => <span>selectSignatories</span>,
  ConfirmSignatories: () => <span>confirmSignatories</span>,
}));

describe('screen/CreateMultisigAccount', () => {
  test('should render component', () => {
    render(<CreateMultisigAccount isOpen={true} onClose={noop} />, { wrapper: MemoryRouter });

    const text = screen.getByText('createMultisigAccount.title');
    const form = screen.getByText('walletForm');
    const select = screen.getByText('selectSignatories');
    expect(text).toBeInTheDocument();
    expect(form).toBeInTheDocument();
    expect(select).toBeInTheDocument();
  });
});
