import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Address, Balance, Checkbox } from '@renderer/components/ui';
import { Asset } from '@renderer/domain/asset';
import Validators from './Validators';

jest.mock('@renderer/components/ui');

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/staking/stakingService', () => ({
  useStaking: jest.fn().mockReturnValue({
    validators: {
      '5CFPcUJgYgWryPaV1aYjSbTpbTLu42V32Ytw1L9rfoMAsfGh': {
        address: '5CFPcUJgYgWryPaV1aYjSbTpbTLu42V32Ytw1L9rfoMAsfGh',
        apy: 50.87,
        ownStake: '23611437564986527',
        totalStake: '23728297476615343',
      },
    },
    getMaxValidators: jest.fn().mockReturnValue(6),
    getValidators: jest.fn(),
    subscribeActiveEra: jest.fn(),
  }),
}));

describe('screens/Bond/Validators', () => {
  beforeAll(() => {
    (Checkbox as jest.Mock).mockImplementation(({ children }: any) => <span>{children}</span>);
    (Address as jest.Mock).mockImplementation(({ address }: any) => <span>{address}</span>);
    (Balance as jest.Mock).mockImplementation(({ value }: any) => <span>{value}</span>);
  });

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

    const validators = screen.getByRole('listitem');
    const address = screen.getByText('5CFPcUJgYgWryPaV1aYjSbTpbTLu42V32Ytw1L9rfoMAsfGh');
    const apy = screen.getByText('50.87%');
    const ownStake = screen.getByText('23611437564986527');
    const totalStake = screen.getByText('23728297476615343');
    expect(validators).toBeInTheDocument();
    expect(address).toBeInTheDocument();
    expect(apy).toBeInTheDocument();
    expect(ownStake).toBeInTheDocument();
    expect(totalStake).toBeInTheDocument();
  });

  test('should render loading', () => {
    render(<Validators onResult={() => {}} />, { wrapper: MemoryRouter });

    const title = screen.getByText('LOADING');
    expect(title).toBeInTheDocument();
  });
});
