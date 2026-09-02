import { BN, BN_ZERO } from '@polkadot/util';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type Wallet, SigningType, WalletType } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { createAccountId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { ThemeProvider } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { type LocksTableState } from '../hooks/useLocksTable';
import { type GovernanceLockRow } from '../lib/buildLockRows';

import { LocksTable } from './LocksTable';

// Name resolution reaches into wallet/contact stores; the table only needs a
// label per row.
vi.mock('@/widgets/NameResolver', () => ({
  NamedAccount: ({ accountId }: { accountId: string }) => <span>{accountId}</span>,
}));

const lockedId = createAccountId('locked');
const wallet: Wallet = { id: 1, name: 'Vault', type: WalletType.POLKADOT_VAULT, accounts: [] };
const signer: AnyAccount = {
  id: 'signer',
  type: 'universal',
  name: '',
  walletId: wallet.id,
  accountId: lockedId,
  cryptoType: 0,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
};

const row = (overrides: Partial<GovernanceLockRow> = {}): GovernanceLockRow => ({
  key: 'row',
  accountId: lockedId,
  chainId: polkadotChainId,
  chain: polkadotChain,
  chainName: 'Polkadot',
  chainIcon: 'polkadot.svg',
  symbol: 'DOT',
  precision: 10,
  wallet,
  locked: new BN('1000000000000'),
  lockedFiat: null,
  claimable: new BN('1000000000000'),
  claimableFiat: null,
  claimableActions: [{ type: 'unlock', trackId: '0' }],
  pending: BN_ZERO,
  pendingFiat: null,
  nextUnlockAtMs: null,
  daysUntilNextUnlock: null,
  delegated: BN_ZERO,
  delegatedFiat: null,
  tracks: ['0'],
  initiator: signer,
  target: lockedId,
  blockReason: null,
  claimableNum: 1e12,
  lockedNum: 1e12,
  ...overrides,
});

const state = (rows: GovernanceLockRow[], overrides: Partial<LocksTableState> = {}): LocksTableState => ({
  rows,
  visibleRows: rows,
  pending: false,
  fiatFlag: false,
  currency: null,
  totals: null,
  uniqueChains: [],
  chainFilter: null,
  setChainFilter: vi.fn(),
  claimableOnly: false,
  setClaimableOnly: vi.fn(),
  onUnlock: vi.fn(),
  ...overrides,
});

const renderTable = (mode: 'compact' | 'full', tableState: LocksTableState, rows = tableState.rows) =>
  render(
    <I18Provider>
      <ThemeProvider>
        <LocksTable mode={mode} state={tableState} rows={rows} />
      </ThemeProvider>
    </I18Provider>,
  );

const headers = () =>
  screen
    .getAllByRole('columnheader')
    // A sortable header also renders a sort glyph, and a hinted one an icon;
    // the label is the trigger button's own first text node.
    .map((cell) => (cell.querySelector('button')?.firstChild?.textContent ?? cell.textContent)?.trim());

describe('features/dashboard-governance/ui/LocksTable', () => {
  it('shows only Account, Locked and Action in compact mode', () => {
    renderTable('compact', state([row()]));

    expect(headers()).toEqual(['Account', 'Locked', 'Action']);
  });

  it('shows the full column set in full mode, without empty Pending and Delegated', () => {
    renderTable('full', state([row()]));

    expect(headers()).toEqual(['Account', 'Chain', 'Locked', 'Claimable', 'Tracks', 'Action']);
  });

  it('brings Pending and Delegated back in full mode when a row has them', () => {
    renderTable('full', state([row({ pending: new BN(5), delegated: new BN(5) })]));

    expect(headers()).toEqual(['Account', 'Chain', 'Locked', 'Claimable', 'Pending', 'Delegated', 'Tracks', 'Action']);
  });

  it('captions the compact Locked cell with what is claimable', () => {
    renderTable('compact', state([row()]));

    expect(screen.getByText('100 DOT claimable')).toBeInTheDocument();
  });

  it('captions the compact Locked cell with the release line when nothing is claimable', () => {
    renderTable(
      'compact',
      state([row({ claimable: BN_ZERO, claimableActions: [], pending: new BN(5), nextUnlockAtMs: null })]),
    );

    expect(screen.getByText('date unavailable')).toBeInTheDocument();
  });

  it('renders the skeleton while loading with no rows', () => {
    renderTable('compact', state([], { pending: true }));

    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
  });

  it('says no locks when loaded and empty', () => {
    renderTable('compact', state([]));

    expect(screen.getByText('No governance locks found')).toBeInTheDocument();
  });

  it('says no rows match when filters hide every row', () => {
    renderTable('full', state([row()]), []);

    expect(screen.getByText('No locks match your filters')).toBeInTheDocument();
  });

  it('shows the chain icon next to the account only in compact mode', () => {
    renderTable('compact', state([row()]));

    expect(screen.getByRole('img', { name: 'Polkadot' })).toBeInTheDocument();
  });

  it('leaves the chain icon to the Chain column in full mode', () => {
    renderTable('full', state([row()]));

    expect(screen.queryByRole('img', { name: 'Polkadot' })).toBeNull();
  });
});
