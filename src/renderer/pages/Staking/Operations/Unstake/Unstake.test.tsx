import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Unstake } from './Unstake';

jest.mock('react-router-dom', () => ({
  useSearchParams: jest.fn().mockReturnValue([new URLSearchParams('id=1,2,3')]),
  useParams: jest.fn().mockReturnValue({ chainId: '0x123' }),
  useNavigate: jest.fn(),
}));

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
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

jest.mock('@entities/network', () => ({
  ...jest.requireActual('@entities/network'),
  chainsService: {
    getChainById: jest.fn().mockReturnValue({
      name: 'Westend',
      chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
      assets: [
        {
          assetId: 0,
          symbol: 'WND',
          precision: 10,
          staking: 'relaychain',
          name: 'Westend',
        },
      ],
    }),
  },

  useNetworkData: jest.fn().mockReturnValue({
    chain: {
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
    },
    api: { isConnected: true },
  }),
}));

describe('pages/Staking/Unstake', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<Unstake />, { wrapper: MemoryRouter });
    });

    const title = screen.getByText('staking.unstake.title');
    const next = screen.getByText('to confirm');
    expect(title).toBeInTheDocument();
    expect(next).toBeInTheDocument();
  });

  test('should change process state', async () => {
    await act(async () => {
      render(<Unstake />, { wrapper: MemoryRouter });
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
