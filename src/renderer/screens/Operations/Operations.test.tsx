import { render, screen } from '@testing-library/react';

import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';
import Operations from './Operations';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getActiveAccounts: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
  }),
}));

jest.mock('@renderer/services/multisigTx/multisigTxService', () => ({
  useMultisigTx: jest.fn().mockReturnValue({
    getLiveAccountMultisigTxs: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
  }),
}));

jest.mock('./components/Chain', () => () => 'Chain');
jest.mock('./components/TransactionAmount', () => () => 'TransactionAmount');
jest.mock('./components/TransactionTitle', () => () => 'TransactionTitle');
jest.mock('./components/EmptyState/EmptyOperations', () => () => 'EmptyState/EmptyOperations');
jest.mock('./components/Operation', () => () => 'Operation');
jest.mock('./components/Filters', () => () => 'Filters');

describe('screen/Operations', () => {
  test('should render component', () => {
    render(<Operations />);

    const title = screen.getByText('operations.title');
    expect(title).toBeInTheDocument();
  });
});
