import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ConnectionStatus } from '@renderer/domain/connection';
import { TEST_PUBLIC_KEY } from '@renderer/shared/utils/constants';
import Bond from './Bond';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('react-router-dom', () => ({
  useSearchParams: jest.fn().mockReturnValue([new URLSearchParams('id=1,2,3')]),
  useParams: jest.fn().mockReturnValue({ chainId: '0x123' }),
  useNavigate: jest.fn(),
}));

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x123': {
        name: 'Westend',
        assets: [
          {
            assetId: 0,
            symbol: 'WND',
            precision: 10,
            staking: 'relaychain',
            name: 'Westend',
          },
        ],
        connection: {
          chainId: '0x123',
          connectionStatus: ConnectionStatus.CONNECTED,
        },
      },
    },
  })),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getActiveAccounts: () => [
      {
        name: 'Test Wallet',
        accountId: '1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ',
        publicKey: TEST_PUBLIC_KEY,
      },
    ],
  }),
}));

jest.mock('@renderer/services/balance/balanceService', () => ({
  useBalance: jest.fn().mockReturnValue({
    getBalance: jest.fn().mockReturnValue({
      assetId: 1,
      chainId: '0x123',
      publicKey: TEST_PUBLIC_KEY,
      free: '10',
      frozen: [{ type: 'test', amount: '1' }],
    }),
  }),
}));

const mockButton = (text: string, callback: () => void) => (
  <button type="button" onClick={callback}>
    {text}
  </button>
);

jest.mock('./InitBond/InitBond', () => ({ onResult }: any) => {
  return mockButton('init', onResult);
});
jest.mock('./Validators/Validators', () => ({ onResult }: any) => {
  return mockButton('validators', onResult);
});
jest.mock('./ConfirmBond/ConfirmBond', () => ({ onResult }: any) => {
  return mockButton('confirm', onResult);
});

describe('screens/Bond/ConfirmBond', () => {
  test('should render component', () => {
    render(<Bond />, { wrapper: MemoryRouter });

    const title = screen.getByText('staking.title');
    const subTitle = screen.getByText('staking.bond.initBondSubtitle');
    const initBond = screen.getByText('init');
    expect(title).toBeInTheDocument();
    expect(subTitle).toBeInTheDocument();
    expect(initBond).toBeInTheDocument();
  });

  test('should change bond process state', async () => {
    render(<Bond />, { wrapper: MemoryRouter });

    const initBond = screen.getByRole('button', { name: 'init' });
    await act(async () => initBond.click());

    const validatorsBond = screen.getByRole('button', { name: 'validators' });
    expect(validatorsBond).toBeInTheDocument();
    expect(initBond).not.toBeInTheDocument();

    await act(async () => validatorsBond.click());

    const confirmBond = screen.getByRole('button', { name: 'confirm' });
    expect(validatorsBond).not.toBeInTheDocument();
    expect(confirmBond).toBeInTheDocument();
  });
});
