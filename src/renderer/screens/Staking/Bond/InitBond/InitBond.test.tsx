import { ApiPromise } from '@polkadot/api';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import InitBond from './InitBond';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Bond/InitBond', () => {
  test('should render component', () => {
    render(<InitBond api={{} as ApiPromise} chainId="0x123" onResult={() => {}} />, { wrapper: MemoryRouter });

    const title = screen.getByText('START BOND');
    expect(title).toBeInTheDocument();
  });

  test('should render loading', () => {
    render(<InitBond onResult={() => {}} />, { wrapper: MemoryRouter });

    const loading = screen.getByText('LOADING');
    expect(loading).toBeInTheDocument();
  });
});
