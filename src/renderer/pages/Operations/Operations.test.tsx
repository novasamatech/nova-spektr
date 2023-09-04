import { render, screen, act } from '@testing-library/react';

import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';
import { ConnectionType } from '@renderer/domain/connection';
import { Operations } from './Operations';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x00': {
        chainId: '1',
        assets: [{ assetId: '1', symbol: '1' }],
        connection: {
          connectionType: ConnectionType.RPC_NODE,
        },
      },
    },
  })),
}));

jest.mock('@renderer/entities/multisig', () => ({
  useMultisigTx: jest.fn().mockReturnValue({
    getLiveAccountMultisigTxs: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID }],
  }),
  useMultisigEvent: jest.fn().mockReturnValue({
    getLiveEventsByKeys: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock('@renderer/entities/account', () => ({
  useAccount: jest.fn().mockReturnValue({
    getActiveMultisigAccount: () => [{ name: 'Test Account', accountId: TEST_ACCOUNT_ID }],
  }),
}));

jest.mock('./components/Operation', () => () => 'Operation');
jest.mock('../../features/operation', () => ({
  OperationsFilter: () => 'filters',
}));

describe('pages/Operations', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<Operations />);
    });

    const title = screen.getByText('operations.title');
    const filters = screen.getByText('filters');

    expect(title).toBeInTheDocument();
    expect(filters).toBeInTheDocument();
  });
});
