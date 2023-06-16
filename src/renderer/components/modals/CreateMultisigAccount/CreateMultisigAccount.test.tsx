import { render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';
import CreateMultisigAccount from './CreateMultisigAccount';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getLiveAccounts: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
    addAccount: jest.fn(),
  }),
}));

jest.mock('@renderer/services/contact/contactService', () => ({
  useContact: jest.fn().mockReturnValue({
    getLiveContacts: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('@renderer/services/contact/contactService', () => ({
  useContact: jest.fn().mockReturnValue({
    getLiveContacts: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn().mockReturnValue({
    getLiveWallets: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('@renderer/context/MatrixContext', () => ({
  useMatrix: jest.fn().mockReturnValue({
    matrix: {
      cancelRoomCreation: jest.fn(),
      startRoomCreation: jest.fn(),
      finishRoomCreation: jest.fn(),
      userId: 'userId',
    },
    isLoggedIn: true,
  }),
}));
jest.mock('@renderer/screens/Settings', () => ({ Matrix: () => () => 'Matrix' }));
jest.mock('@renderer/components/ui-redesign/Animation/Animation', () => 'animation');

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

describe('screen/CreateMultisigAccount', () => {
  test('should render component', () => {
    render(<CreateMultisigAccount isOpen={true} onClose={noop} />);

    const text = screen.getByText('createMultisigAccount.title');
    expect(text).toBeInTheDocument();
  });
});
