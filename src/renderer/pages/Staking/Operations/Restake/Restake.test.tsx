import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ConnectionStatus } from '@shared/core';
import { Restake } from './Restake';

jest.mock('react-router-dom', () => ({
  useSearchParams: jest.fn().mockReturnValue([new URLSearchParams('id=1,2,3')]),
  useParams: jest.fn().mockReturnValue({ chainId: '0x123' }),
  useNavigate: jest.fn(),
}));

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
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

jest.mock('@entities/staking', () => ({
  useStakingData: jest.fn().mockReturnValue({
    subscribeStaking: jest.fn(),
  }),
}));

const mockButton = (text: string, callback: () => void) => (
  <button type="button" onClick={callback}>
    {text}
  </button>
);

jest.mock('./InitOperation/InitOperation', () => ({ onResult }: any) => {
  const payload = { accounts: [] };

  return mockButton('to confirm', () => onResult(payload));
});

jest.mock('../components/index', () => ({
  Confirmation: ({ onResult }: any) => mockButton('to sign', onResult),
  Submit: () => 'finish',
}));

jest.mock('@features/operation', () => ({
  Signing: ({ onResult }: any) => mockButton('to submit', onResult),
}));

describe('pages/Staking/Restake', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<Restake />, { wrapper: MemoryRouter });
    });

    const title = screen.getByText('staking.restake.title');
    const next = screen.getByText('to confirm');
    expect(title).toBeInTheDocument();
    expect(next).toBeInTheDocument();
  });

  test('should change process state', async () => {
    await act(async () => {
      render(<Restake />, { wrapper: MemoryRouter });
    });

    let nextButton = screen.getByRole('button', { name: 'to confirm' });
    await act(async () => nextButton.click());

    nextButton = screen.getByRole('button', { name: 'to sign' });
    await act(async () => nextButton.click());

    nextButton = screen.getByRole('button', { name: 'to submit' });
    await act(async () => nextButton.click());

    const finish = screen.getByText('finish');
    expect(finish).toBeInTheDocument();
  });
});
