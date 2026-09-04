import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { I18Provider } from '@/shared/i18n';
import { kusamaChain, kusamaChainId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { ThemeProvider } from '@/shared/ui-kit';
import { type LocksTableState } from '../hooks/useLocksTable';
import { makeLockRow as row, makeLocksTableState } from '../lib/__tests__/fixtures';

import { LocksFullScreen } from './LocksFullScreen';

// Name resolution reaches into wallet/contact stores; the table only needs a
// label per row.
vi.mock('@/widgets/NameResolver', () => ({
  NamedAccount: ({ accountId }: { accountId: string }) => <span>{accountId}</span>,
}));

/** The chain picker has something to pick from, unlike the compact card's. */
const state = (overrides: Partial<LocksTableState> = {}): LocksTableState =>
  makeLocksTableState({
    rows: [row()],
    uniqueChains: [
      { chainId: polkadotChainId, chainName: polkadotChain.name, chainIcon: polkadotChain.icon },
      { chainId: kusamaChainId, chainName: kusamaChain.name, chainIcon: kusamaChain.icon },
    ],
    ...overrides,
  });

const renderFullScreen = (tableState: LocksTableState) => {
  render(
    <I18Provider>
      <ThemeProvider>
        <LocksFullScreen state={tableState} isOpen onToggle={() => {}} />
      </ThemeProvider>
    </I18Provider>,
  );
};

// The Select's popover portals to the body, outside the modal, so Radix's
// dialog marks it `aria-hidden` — `hidden: true` looks past that. In the app
// the popover is on top of the modal and reachable.
const chainOption = (name: string) => screen.findByRole('option', { name, hidden: true });

// Ariakit paints the popover with pointer-events off until it is positioned,
// which never happens without a layout engine. Only the picker needs the
// escape hatch; the switch is clicked as a user would.
const openChainSelect = async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });

  await user.click(screen.getByTestId('Select'));

  return user;
};

describe('features/dashboard-governance/ui/LocksFullScreen', () => {
  it('drops the chain filter when the all-chains option is picked', async () => {
    const tableState = state({ chainFilter: polkadotChainId });
    renderFullScreen(tableState);

    const user = await openChainSelect();
    await user.click(await chainOption('All chains'));

    expect(tableState.setChainFilter).toHaveBeenCalledWith(null);
  });

  it('sets the chain filter to the picked chain', async () => {
    const tableState = state();
    renderFullScreen(tableState);

    const user = await openChainSelect();
    await user.click(await chainOption('Kusama'));

    expect(tableState.setChainFilter).toHaveBeenCalledWith(kusamaChainId);
  });

  it('turns the claimable-only filter on from the switch', async () => {
    const user = userEvent.setup();
    const tableState = state();
    renderFullScreen(tableState);

    await user.click(screen.getByRole('switch'));

    expect(tableState.setClaimableOnly).toHaveBeenCalledWith(true);
  });

  it('turns the claimable-only filter off again', async () => {
    const user = userEvent.setup();
    const tableState = state({ claimableOnly: true });
    renderFullScreen(tableState);

    await user.click(screen.getByRole('switch'));

    expect(tableState.setClaimableOnly).toHaveBeenCalledWith(false);
  });

  it('shows the filtered rows, not every row', () => {
    const kusamaRow = row({ key: 'kusama', chainId: kusamaChainId, chainName: 'Kusama' });
    renderFullScreen(state({ rows: [row(), kusamaRow], visibleRows: [kusamaRow] }));

    expect(screen.getByText('1 lock')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(2); // header + the single visible row
  });

  it('keeps the filters reachable when they have hidden every row', () => {
    // The bar gates on `rows`, not `visibleRows` — filtering down to nothing
    // must not take away the controls that would undo it.
    renderFullScreen(state({ rows: [row()], visibleRows: [] }));

    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.getByTestId('Select')).toBeInTheDocument();
    expect(screen.getByText('0 locks')).toBeInTheDocument();
  });

  it('keeps the filter bar out of the way when there is nothing to filter', () => {
    renderFullScreen(state({ rows: [] }));

    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByTestId('Select')).toBeNull();
  });

  it('tops the table with the fiat totals strip when there is one', () => {
    renderFullScreen(
      state({
        showTotals: true,
        totals: { claimable: '120', pending: '30', delegated: '0' },
        currency: {
          id: 1,
          code: 'usd',
          name: 'US Dollar',
          symbol: '$',
          category: 'fiat',
          popular: true,
          coingeckoId: 'usd',
        },
      }),
    );

    // The row has no pending or delegated balance, so those two columns are
    // absent from the table and the labels can only be the strip's.
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Delegated')).toBeInTheDocument();
    expect(screen.getByText('$120')).toBeInTheDocument();
  });

  it('leaves the strip out when there is nothing to total', () => {
    renderFullScreen(state());

    expect(screen.queryByText('Pending')).toBeNull();
    expect(screen.queryByText('Delegated')).toBeNull();
  });
});
