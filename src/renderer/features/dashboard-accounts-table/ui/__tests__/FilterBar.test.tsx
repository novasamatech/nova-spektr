import { fireEvent, render, screen } from '@testing-library/react';

import { I18Provider } from '@/shared/i18n';
import { createAccountId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ThemeProvider } from '@/shared/ui-kit';
import { makeRow } from '../../lib/__tests__/fixtures';
import { type TableFilters, EMPTY_FILTERS } from '../../lib/filters';
import { FilterBar } from '../FilterBar';

const rows = [
  makeRow({
    accountId: createAccountId('polkadot-account') as AccountId,
    networkName: 'Polkadot',
    displayName: 'Polkadot account',
  }),
  makeRow({
    accountId: createAccountId('kusama-account') as AccountId,
    networkName: 'Kusama',
    displayName: 'Kusama account',
  }),
];

const renderFilterBar = (onChange: (filters: TableFilters) => void) => {
  return render(
    <I18Provider>
      <ThemeProvider>
        <FilterBar rows={rows} filters={EMPTY_FILTERS} currencyCode="USD" onChange={onChange} />
      </ThemeProvider>
    </I18Provider>,
  );
};

describe('features/dashboard-accounts-table/ui/FilterBar', () => {
  test('should let Radix own the Network trigger button (aria-haspopup/aria-expanded reach the DOM node)', () => {
    renderFilterBar(() => {});

    const trigger = screen.getByRole('button', { name: 'Network: All' });

    // These attributes are set by DropdownMenu.Trigger via `asChild` — if
    // TriggerButton drops the cloned props (the regression this guards
    // against), none of them ever reach the rendered <button>.
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('data-state', 'closed');
  });

  test('should open the menu on click and toggle a network filter through it', async () => {
    const onChange = vi.fn();
    renderFilterBar(onChange);

    const trigger = screen.getByRole('button', { name: 'Network: All' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Radix's DropdownMenuTrigger opens on `pointerdown`, not `click` — see
    // @radix-ui/react-dropdown-menu's Trigger implementation.
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });

    const menu = await screen.findByRole('menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const kusamaOption = await screen.findByText('Kusama');
    expect(menu).toContainElement(kusamaOption);
    expect(await screen.findByText('Polkadot')).toBeInTheDocument();

    fireEvent.click(kusamaOption);

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, networks: ['Kusama'] });
  });
});
