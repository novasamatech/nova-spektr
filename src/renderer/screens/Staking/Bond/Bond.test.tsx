import { render, screen, act } from '@testing-library/react';
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
