import { render, screen } from '@testing-library/react';

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

jest.mock('./SelectContactsModal', () => () => 'SelectContactsModal');
jest.mock('../Settings', () => ({ Matrix: () => () => 'Matrix' }));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

describe('screen/CreateMultisigAccount', () => {
  test('should render component', () => {
    render(<CreateMultisigAccount />);

    const text = screen.getByText('createMultisigAccount.title');
    expect(text).toBeInTheDocument();
  });
});
