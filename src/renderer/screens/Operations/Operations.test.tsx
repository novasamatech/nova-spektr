import { render, screen } from '@testing-library/react';

import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';
import Operations from './Operations';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/multisigTx/multisigTxService', () => ({
  useMultisigTx: jest.fn().mockReturnValue({
    getLiveAccountMultisigTxs: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
  }),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getActiveMultisigAccount: () => [{ name: 'Test Account', accountId: TEST_ACCOUNT_ID }],
  }),
}));

// TODO add test for Operation component and move it there
// jest.mock('./components/Chain/Chain', () => () => 'Chain');
// jest.mock('./components/TransactionAmount', () => () => 'TransactionAmount');
// jest.mock('./components/TransactionTitle/TransactionTitle', () => () => 'TransactionTitle');
// jest.mock('./components/EmptyState/EmptyOperations', () => () => 'EmptyState/EmptyOperations');
jest.mock('./components/Operation', () => () => 'Operation');
jest.mock('./components/Filters', () => () => 'Filters');

describe('screen/Operations', () => {
  test('should render component', () => {
    render(<Operations />);

    const title = screen.getByText('operations.title');
    expect(title).toBeInTheDocument();
  });
});
