import { render, screen } from '@testing-library/react';

import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';
import { ConnectionType } from '@renderer/domain/connection';
import Operations from './Operations';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

const mockTxs = [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }];
const mockAccounts = [{ name: 'Test Account', accountId: TEST_ACCOUNT_ID }];

jest.mock('@renderer/services/multisigTx/multisigTxService', () => ({
  useMultisigTx: jest.fn().mockReturnValue({
    getLiveAccountMultisigTxs: () => mockTxs,
  }),
}));

jest.mock('@renderer/services/multisigEvent/multisigEventService', () => ({
  useMultisigEvent: jest.fn().mockReturnValue({
    getLiveEventsByKeys: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getActiveMultisigAccount: () => mockAccounts,
  }),
}));

jest.mock('@renderer/app/providers', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x0000000000000000000000000000000000000000': {
        chainId: '1',
        assets: [{ assetId: '1', symbol: '1' }],
        connection: {
          connectionType: ConnectionType.RPC_NODE,
        },
      },
    },
  })),
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
