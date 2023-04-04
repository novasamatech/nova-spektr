import { render, screen } from '@testing-library/react';

import { TEST_ADDRESS, TEST_PUBLIC_KEY } from '@renderer/shared/utils/constants';
import Operations from './Operations';
import { ConnectionType } from '@renderer/domain/connection';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getActiveAccounts: () => [
      {
        name: 'Test Wallet',
        accountId: TEST_ADDRESS,
        publicKey: TEST_PUBLIC_KEY,
      },
    ],
  }),
}));

jest.mock('@renderer/services/multisigTx/multisigTxService', () => ({
  useMultisigTx: jest.fn().mockReturnValue({
    getLiveAccountMultisigTxs: () => [],
    updateCallData: () => [],
  }),
}));

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x0000000000000000000000000000000000000000': {
        chainId: '1',
        assets: [
          { assetId: '1', symbol: '1' },
          { assetId: '2', symbol: '2' },
        ],
        connection: {
          connectionType: ConnectionType.RPC_NODE,
        },
      },
    },
  })),
}));

jest.mock('./components/Chain', () => () => 'Chain');
jest.mock('./components/ShortTransactionInfo', () => () => 'ShortTransactionInfo');
jest.mock('./components/TransactionTitle', () => () => 'TransactionTitle');
jest.mock('./components/EmptyState/EmptyOperations', () => () => 'EmptyState/EmptyOperations');

describe('screen/Operations', () => {
  test('should render component', () => {
    render(<Operations />);

    const title = screen.getByText('operations.title');
    expect(title).toBeInTheDocument();
  });
});
