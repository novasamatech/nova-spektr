import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ConnectionStatus } from '@renderer/domain/connection';
import Bond from './Bond';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e': {
        name: 'Westend',
        connection: {
          chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
          connectionStatus: ConnectionStatus.CONNECTED,
        },
      },
    },
  })),
}));

describe('screens/Bond/ConfirmBond', () => {
  test('should render component', () => {
    render(<Bond />, { wrapper: MemoryRouter });
  });
});
