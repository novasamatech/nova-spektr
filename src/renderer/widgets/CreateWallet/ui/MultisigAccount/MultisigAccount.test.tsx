import { render, screen, act } from '@testing-library/react';
import { fork } from 'effector';
import noop from 'lodash/noop';
import { Provider } from 'effector-react';

import { contactModel } from '@entities/contact';
import { walletModel } from '@entities/wallet';
import { MultisigAccount } from './MultisigAccount';

jest.mock('@app/providers', () => ({
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

jest.mock('@entities/network', () => ({
  chainsService: {
    getChainsData: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@widgets/MatrixModal', () => ({
  MatrixLoginModal: () => <span>matrixModal</span>,
}));

jest.mock('@entities/transaction', () => ({
  OperationResult: () => <span>operationResult</span>,
}));

jest.mock('./components', () => ({
  WalletForm: () => <span>walletForm</span>,
  SelectSignatories: () => <span>selectSignatories</span>,
  ConfirmSignatories: () => <span>confirmSignatories</span>,
}));

describe('widgets/CreteWallet/ui/MultisigAccount', () => {
  test('should render component', async () => {
    const scope = fork({
      values: new Map().set(contactModel.$contacts, []).set(walletModel.$wallets, []).set(walletModel.$accounts, []),
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <MultisigAccount isOpen={true} onClose={noop} onComplete={noop} />
        </Provider>,
      );
    });
    const text = screen.getByText('createMultisigAccount.title');
    const form = screen.getByText('walletForm');
    const select = screen.getByText('selectSignatories');
    expect(text).toBeInTheDocument();
    expect(form).toBeInTheDocument();
    expect(select).toBeInTheDocument();
  });
});
