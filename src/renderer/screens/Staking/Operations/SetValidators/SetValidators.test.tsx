import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ConnectionStatus } from '@renderer/domain/connection';
import SetValidators from './SetValidators';

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

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getLiveAccounts: () => [],
  }),
}));

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x123': {
        name: 'Westend',
        api: { isConnected: true },
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

const mockButton = (text: string, callback: () => void) => (
  <button type="button" onClick={callback}>
    {text}
  </button>
);

jest.mock('../components/index', () => ({
  Validators: ({ onResult }: any) => mockButton('to confirm', onResult),
  Confirmation: ({ onResult }: any) => mockButton('to scan', onResult),
  Scanning: ({ onResult }: any) => mockButton('to sign', onResult),
  Signing: ({ onResult }: any) => mockButton('to submit', onResult),
  Submit: () => 'finish',
}));

describe('screens/Staking/SetValidators', () => {
  test('should render component', () => {
    render(<SetValidators />, { wrapper: MemoryRouter });

    const title = screen.getByText('staking.title');
    const subTitle = screen.getByText('staking.bond.validatorsSubtitle');
    const next = screen.getByText('to confirm');
    expect(title).toBeInTheDocument();
    expect(subTitle).toBeInTheDocument();
    expect(next).toBeInTheDocument();
  });

  test('should change process state', async () => {
    render(<SetValidators />, { wrapper: MemoryRouter });

    let nextButton = screen.getByRole('button', { name: 'to confirm' });
    await act(async () => nextButton.click());

    nextButton = screen.getByRole('button', { name: 'to scan' });
    await act(async () => nextButton.click());

    nextButton = screen.getByRole('button', { name: 'to sign' });
    await act(async () => nextButton.click());

    nextButton = screen.getByRole('button', { name: 'to submit' });
    await act(async () => nextButton.click());

    const finish = screen.getByText('finish');
    expect(finish).toBeInTheDocument();
  });
});
