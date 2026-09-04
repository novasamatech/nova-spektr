import { BN, BN_ZERO } from '@polkadot/util';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type Wallet, SigningType, WalletType } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { createAccountId, kusamaChain, kusamaChainId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { ThemeProvider } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { type LocksTableState } from '../hooks/useLocksTable';
import { type GovernanceLockRow } from '../lib/buildLockRows';

import { LocksFullScreen } from './LocksFullScreen';

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
  delegations: [],
  undelegateActions: [],
  undelegateInitiator: null,
  undelegateBlockReason: null,
  tracks: ['0'],
  initiator: signer,
  target: lockedId,
  blockReason: null,
  claimableNum: 1e12,
  lockedNum: 1e12,
  ...overrides,
});

const state = (overrides: Partial<LocksTableState> = {}): LocksTableState => {
  const rows = overrides.rows ?? [row()];

  return {
    rows,
    visibleRows: rows,
    pending: false,
    fiatFlag: false,
    currency: null,
    totals: null,
    showTotals: false,
    uniqueChains: [
      { chainId: polkadotChainId, chainName: polkadotChain.name, chainIcon: polkadotChain.icon },
      { chainId: kusamaChainId, chainName: kusamaChain.name, chainIcon: kusamaChain.icon },
    ],
    chainFilter: null,
    setChainFilter: vi.fn(),
    claimableOnly: false,
    setClaimableOnly: vi.fn(),
    onUnlock: vi.fn(),
    onUndelegate: vi.fn(),
    ...overrides,
  };
};

const renderFullScreen = (tableState: LocksTableState) =>
  render(
    <I18Provider>
      <ThemeProvider>
        <LocksFullScreen state={tableState} isOpen onToggle={() => {}} />
      </ThemeProvider>
    </I18Provider>,
  );

// Ariakit paints the popover with pointer-events off until it is positioned,
// which never happens without a layout engine.
const user = userEvent.setup({ pointerEventsCheck: 0 });

// The Select's popover portals to the body, outside the modal, so Radix's
// dialog marks it `aria-hidden` — `hidden: true` looks past that. In the app
// the popover is on top of the modal and reachable.
const chainOption = (name: string) => screen.findByRole('option', { name, hidden: true });

const openChainSelect = async () => {
  await user.click(screen.getByTestId('Select'));
};

describe('features/dashboard-governance/ui/LocksFullScreen', () => {
  it('drops the chain filter when the all-chains option is picked', async () => {
    const tableState = state({ chainFilter: polkadotChainId });
    renderFullScreen(tableState);

    await openChainSelect();
    await user.click(await chainOption('All chains'));

    expect(tableState.setChainFilter).toHaveBeenCalledWith(null);
  });

  it('sets the chain filter to the picked chain', async () => {
    const tableState = state();
    renderFullScreen(tableState);

    await openChainSelect();
    await user.click(await chainOption('Kusama'));

    expect(tableState.setChainFilter).toHaveBeenCalledWith(kusamaChainId);
  });

  it('turns the claimable-only filter on from the switch', async () => {
    const tableState = state();
    renderFullScreen(tableState);

    await user.click(screen.getByRole('switch'));

    expect(tableState.setClaimableOnly).toHaveBeenCalledWith(true);
  });

  it('turns the claimable-only filter off again', async () => {
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

  it('keeps the filter bar out of the way when there is nothing to filter', () => {
    renderFullScreen(state({ rows: [], visibleRows: [] }));

    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByTestId('Select')).toBeNull();
  });
});
