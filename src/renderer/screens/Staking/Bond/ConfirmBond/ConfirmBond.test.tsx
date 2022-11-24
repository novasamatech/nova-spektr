import { ApiPromise } from '@polkadot/api';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import ConfirmBond from './ConfirmBond';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Bond/ConfirmBond', () => {
  test('should render component', () => {
    render(<ConfirmBond api={{} as ApiPromise} chainId="0x123" onResult={() => {}} />, { wrapper: MemoryRouter });

    const title = screen.getByText('FINISH CONFIRM');
    expect(title).toBeInTheDocument();
  });

  test('should render loading', () => {
    render(<ConfirmBond onResult={() => {}} />, { wrapper: MemoryRouter });

    const loading = screen.getByText('LOADING');
    expect(loading).toBeInTheDocument();
  });
});
