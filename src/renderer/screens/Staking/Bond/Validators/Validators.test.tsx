import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Asset } from '@renderer/domain/asset';
import Validators from './Validators';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/staking/validatorsService', () => ({
  useValidators: jest.fn().mockReturnValue({
    getMaxValidators: jest.fn().mockReturnValue(6),
    getValidators: jest.fn(() => ({
      '5CFPcUJgYgWryPaV1aYjSbTpbTLu42V32Ytw1L9rfoMAsfGh': {
        address: '5CFPcUJgYgWryPaV1aYjSbTpbTLu42V32Ytw1L9rfoMAsfGh',
        apy: 50.87,
        ownStake: '23611437564986527',
        totalStake: '23728297476615343',
        identity: {
          subName: 'subName',
          parent: { name: 'parent' },
        },
      },
    })),
  }),
}));

jest.mock('@renderer/services/staking/eraService', () => ({
  useEra: jest.fn().mockReturnValue({
    subscribeActiveEra: jest.fn().mockImplementation((api: any, eraCallback: any) => eraCallback(1)),
  }),
}));

describe('screens/Bond/Validators', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', async () => {
    const api = { isConnected: true } as ApiPromise;
    const asset = {
      assetId: 0,
      symbol: 'WND',
      precision: 12,
      staking: 'relaychain',
    } as Asset;

    await act(async () => {
      render(<Validators api={api} chainId="0x123" asset={asset} onResult={() => {}} />);
    });

    const table = screen.getByRole('table');
    const identity = screen.getByText('parent/subName');
    const stakes = screen.getAllByText('assetBalance.number');
    const continueButton = screen.getByRole('button', { name: 'staking.validators.selectValidatorButton' });
    expect(table).toBeInTheDocument();
    expect(identity).toBeInTheDocument();
    expect(stakes).toHaveLength(2);
    expect(continueButton).toBeInTheDocument();
  });

  test('should render loading', () => {
    render(<Validators onResult={() => {}} />, { wrapper: MemoryRouter });

    const table = screen.getByRole('table');
    const rows = screen.getAllByRole('row');
    const continueButton = screen.queryByRole('button', { name: 'staking.validators.selectValidatorButton' });
    expect(table).toBeInTheDocument();
    expect(rows).toHaveLength(11);
    expect(continueButton).not.toBeInTheDocument();
  });
});
