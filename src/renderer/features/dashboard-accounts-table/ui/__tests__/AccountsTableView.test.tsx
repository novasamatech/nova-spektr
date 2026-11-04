import { BN, BN_ZERO } from '@polkadot/util';
import { render, screen } from '@testing-library/react';

import { type Asset } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { createAccountId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ThemeProvider } from '@/shared/ui-kit';
import { type AccountsTableState } from '../../hooks/useAccountsTable';
import { makeRow } from '../../lib/__tests__/fixtures';
import { EMPTY_FILTERS } from '../../lib/filters';
import { DEFAULT_SORT } from '../../lib/sorting';
import { type AccountGroup } from '../../lib/types';
import { AccountsTableView } from '../AccountsTableView';

// Name resolution reaches into wallet/contact stores; the view only needs a
// label per group header.
vi.mock('@/widgets/NameResolver', () => ({
  NamedAccount: ({ accountId }: { accountId: string }) => <span>{accountId}</span>,
}));

const ACCOUNT = createAccountId('table-account') as AccountId;

// Real amounts: the data row renders each bucket through `AssetBalance`.
const row = makeRow({
  accountId: ACCOUNT,
  displayName: 'Table account',
  asset: {
    assetId: 0,
    symbol: 'DOT',
    name: 'Polkadot',
    precision: 10,
    icon: { monochrome: '', colored: '' },
  } as unknown as Asset,
  split: { transferable: new BN(10), staked: null, governance: null, other: BN_ZERO },
  totalBN: new BN(10),
});

const group: AccountGroup = {
  key: ACCOUNT,
  accountId: ACCOUNT,
  name: 'Table account',
  wallet: null,
  walletTypeBucket: 'vault',
  rows: [row],
  subtotalFiat: null,
};

const makeState = (overrides: Partial<AccountsTableState> = {}): AccountsTableState => ({
  rows: [],
  visibleRows: [],
  groups: [],
  ready: true,
  awaitingCount: 0,
  hasSelection: true,
  fiatVisible: false,
  activeCurrency: null,
  formatSubtotal: () => '—',
  filters: EMPTY_FILTERS,
  setFilters: () => {},
  activeFilterCount: 0,
  chips: [],
  clearAll: () => {},
  search: '',
  setSearch: () => {},
  sort: DEFAULT_SORT,
  applySort: () => {},
  isGroupOpen: () => true,
  toggleGroup: () => {},
  allOpen: true,
  toggleAllGroups: () => {},
  exportCsv: () => {},
  ...overrides,
});

const renderView = (state: AccountsTableState) =>
  render(
    <I18Provider>
      <ThemeProvider>
        <AccountsTableView table={state} />
      </ThemeProvider>
    </I18Provider>,
  );

// The table skeleton is made of bare placeholder spans. Icons suspend behind a
// tagged skeleton and `ChainIcon` wraps its image in one, so neither counts.
const skeletonCount = (container: HTMLElement) =>
  container.querySelectorAll('.spektr-skeleton:not([data-testid]):empty').length;

describe('features/dashboard-accounts-table/ui/AccountsTableView', () => {
  describe('readiness', () => {
    it('SP-26: shows the skeleton, no rows and no footer while the selection is not ready', () => {
      const { container } = renderView(makeState({ ready: false, rows: [row], visibleRows: [row], groups: [group] }));

      expect(skeletonCount(container)).toBeGreaterThan(0);
      expect(screen.queryByText('Table account')).not.toBeInTheDocument();
      expect(screen.queryByText('Chain')).not.toBeInTheDocument();
      expect(screen.queryByText(/Showing \d+ of \d+ rows/)).not.toBeInTheDocument();
      expect(screen.queryByText('No balances to show')).not.toBeInTheDocument();
    });

    it('SP-26: swaps the skeleton for the full table once the selection is ready', () => {
      const { container } = renderView(makeState({ ready: true, rows: [row], visibleRows: [row], groups: [group] }));

      expect(skeletonCount(container)).toBe(0);
      expect(screen.getByText('Chain')).toBeInTheDocument();
      expect(screen.getByText(ACCOUNT)).toBeInTheDocument();
      expect(screen.getByText('Showing 1 of 1 rows in 1 accounts')).toBeInTheDocument();
      expect(screen.queryByText(/have not loaded yet/)).not.toBeInTheDocument();
    });

    it('SP-26: does not read an empty answer as "No balances" while the selection is not ready', () => {
      const { container } = renderView(makeState({ ready: false, rows: [] }));

      expect(skeletonCount(container)).toBeGreaterThan(0);
      expect(screen.queryByText('No balances to show')).not.toBeInTheDocument();
    });
  });

  describe('footer after the wait timed out', () => {
    it('SP-28: footer says one account has not loaded yet', () => {
      renderView(makeState({ ready: true, awaitingCount: 1, rows: [row], visibleRows: [row], groups: [group] }));

      expect(screen.getByText('Balances of 1 account have not loaded yet')).toBeInTheDocument();
    });

    it('SP-28: footer pluralises for several accounts that have not loaded yet', () => {
      renderView(makeState({ ready: true, awaitingCount: 2, rows: [row], visibleRows: [row], groups: [group] }));

      expect(screen.getByText('Balances of 2 accounts have not loaded yet')).toBeInTheDocument();
    });

    it('SP-28: footer has no "not loaded" note when every account answered', () => {
      renderView(makeState({ ready: true, awaitingCount: 0, rows: [row], visibleRows: [row], groups: [group] }));

      expect(screen.getByText('Showing 1 of 1 rows in 1 accounts')).toBeInTheDocument();
      expect(screen.queryByText(/have not loaded yet/)).not.toBeInTheDocument();
    });
  });

  describe('empty selection', () => {
    it('SP-29: renders the no-selection hint right away, without a skeleton or footer', () => {
      const { container } = renderView(makeState({ hasSelection: false, ready: true, rows: [] }));

      expect(screen.getByText('Select accounts above to view balances')).toBeInTheDocument();
      expect(skeletonCount(container)).toBe(0);
      expect(screen.queryByText(/Showing \d+ of \d+ rows/)).not.toBeInTheDocument();
    });

    it('SP-29: no-selection hint wins over readiness — never a skeleton for an empty selection', () => {
      const { container } = renderView(makeState({ hasSelection: false, ready: false, rows: [] }));

      expect(screen.getByText('Select accounts above to view balances')).toBeInTheDocument();
      expect(skeletonCount(container)).toBe(0);
    });
  });
});
