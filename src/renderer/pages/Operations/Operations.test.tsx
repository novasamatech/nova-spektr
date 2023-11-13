import { render, screen, act } from '@testing-library/react';

import { TEST_ACCOUNT_ID } from '@shared/lib/utils';
import { ConnectionType } from '@shared/core';
import { Operations } from './Operations';

jest.mock('@app/providers', () => ({
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

jest.mock('@entities/multisig', () => ({
  useMultisigTx: jest.fn().mockReturnValue({
    getLiveAccountMultisigTxs: () => [{ name: 'Test Wallet', accountId: TEST_ACCOUNT_ID, chainId: '0x00' }],
  }),
  useMultisigEvent: jest.fn().mockReturnValue({
    getLiveEventsByKeys: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock('./components/Operation', () => () => 'Operation');
jest.mock('@features/operation', () => ({
  OperationsFilter: () => 'filter',
}));

describe('pages/Operations', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<Operations />);
    });

    const title = screen.getByText('operations.title');
    const filter = screen.getByText('filter');

    expect(title).toBeInTheDocument();
    expect(filter).toBeInTheDocument();
  });
});
