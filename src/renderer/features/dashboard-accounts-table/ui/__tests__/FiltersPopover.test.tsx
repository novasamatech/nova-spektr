import { fireEvent, render, screen } from '@testing-library/react';

import { type Asset } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { createAccountId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ThemeProvider } from '@/shared/ui-kit';
import { makeRow } from '../../lib/__tests__/fixtures';
import { type TableFilters, EMPTY_FILTERS } from '../../lib/filters';
import { FiltersPopover } from '../FiltersPopover';

const makeAsset = (symbol: string, name: string) =>
  ({ symbol, name, icon: { monochrome: 'data:,', colored: 'data:,' } }) as unknown as Asset;

const rows = [
  makeRow({
    accountId: createAccountId('polkadot-account') as AccountId,
    networkName: 'Polkadot',
    displayName: 'Polkadot account',
    asset: makeAsset('DOT', 'Polkadot'),
  }),
  makeRow({
    accountId: createAccountId('kusama-account') as AccountId,
    networkName: 'Kusama',
    displayName: 'Kusama account',
    asset: makeAsset('DED', 'Dedicated'),
  }),
];

const renderPopover = (onChange: (filters: TableFilters) => void, filters: TableFilters = EMPTY_FILTERS) => {
  return render(
    <I18Provider>
      <ThemeProvider>
        <FiltersPopover rows={rows} filters={filters} currencyCode="USD" onChange={onChange} />
      </ThemeProvider>
    </I18Provider>,
  );
};

const openPopover = () => fireEvent.click(screen.getByRole('button', { name: /Filters/ }));

describe('features/dashboard-accounts-table/ui/FiltersPopover', () => {
  test('should keep every filter behind one trigger until it is opened', () => {
    renderPopover(() => {});

    expect(screen.queryByText('Polkadot')).not.toBeInTheDocument();

    openPopover();

    // The first facet (Network) opens by default when nothing is selected.
    expect(screen.getByText('Polkadot')).toBeInTheDocument();
    expect(screen.getByText('Kusama')).toBeInTheDocument();
  });

  test('should apply a value immediately, without an Apply button', () => {
    const onChange = vi.fn();
    renderPopover(onChange);

    openPopover();
    fireEvent.click(screen.getByText('Kusama'));

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, networks: ['Kusama'] });
  });

  test('should open the facet that carries a selection', () => {
    renderPopover(() => {}, { ...EMPTY_FILTERS, assets: ['DED'] });

    openPopover();

    // Token facet is open — its values are on screen; Network's are not.
    expect(screen.getByText('Dedicated')).toBeInTheDocument();
    expect(screen.queryByText('Polkadot account')).not.toBeInTheDocument();
  });

  test('should filter the token facet by the strings it shows', () => {
    renderPopover(() => {}, { ...EMPTY_FILTERS, assets: ['DED'] });

    openPopover();

    // The query matches an option's own two displayed strings — its symbol and
    // its full name — so searching the name a person reads on screen works.
    fireEvent.change(screen.getByPlaceholderText('Find a token'), { target: { value: 'dedic' } });

    expect(screen.getByText('DED')).toBeInTheDocument();
    expect(screen.queryByText('DOT')).not.toBeInTheDocument();
  });
});
