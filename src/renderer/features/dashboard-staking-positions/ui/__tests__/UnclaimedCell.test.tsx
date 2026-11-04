import { fireEvent, render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider, useUnit } from 'effector-react';
import { describe, expect, it, vi } from 'vitest';

import { I18Provider } from '@/shared/i18n';
import { createAccountId, dotAsset, polkadotAssetHubChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ThemeProvider } from '@/shared/ui-kit';
import type * as StakingDomain from '@/domains/staking';
import { type StakingPosition, type UnclaimedPayouts } from '@/domains/staking';
import { type PositionRow } from '../../lib';
import { UnclaimedCell } from '../UnclaimedCell';

import { $unclaimedPayoutsOverride } from './domainMocks';

/**
 * The payout answer is the boundary. With no override the real domain hook
 * runs: the fork holds no api for the chain, so the scan has nothing to ask and
 * answers `unavailable` — an incomplete scan that found nothing.
 */
vi.mock('@/domains/staking', async (importOriginal) => {
  const actual = await importOriginal<typeof StakingDomain>();
  const { $unclaimedPayoutsOverride } = await import('./domainMocks');

  const useUnclaimedPayouts: typeof actual.useUnclaimedPayouts = (params) => {
    const override = useUnit($unclaimedPayoutsOverride);
    const real = actual.useUnclaimedPayouts(params);

    return override ?? real;
  };

  return { ...actual, useUnclaimedPayouts };
});

const accountId = createAccountId('unclaimed-cell') as AccountId;

const position: StakingPosition = {
  accountId,
  chainId: polkadotAssetHubChain.chainId,
  stake: {
    accountId,
    chainId: polkadotAssetHubChain.chainId,
    controller: accountId,
    stash: accountId,
    active: '1000000000000',
    total: '1000000000000',
    unlocking: [],
  },
  status: 'active',
  statusReason: null,
  kind: 'nominator',
  validator: null,
  nominations: [],
  activeValidators: [],
  unbonding: [],
  redeemable: '0',
  totalUnbonding: '0',
  payee: 'Staked',
  payeeLoaded: true,
};

const row: PositionRow = {
  id: `${polkadotAssetHubChain.chainId}-${accountId}`,
  position,
  accountId,
  chain: polkadotAssetHubChain,
  asset: dotAsset,
  account: null,
  wallet: null,
  access: { mode: 'draft' },
  multisig: null,
  status: 'active',
  staked: '1000000000000',
  sharePercent: 100,
  apy: null,
  activeValidatorCount: 0,
  nominationCount: 0,
  draftCount: 0,
  payee: 'Staked',
  payeeLoaded: true,
};

const COMPLETE_EMPTY: UnclaimedPayouts = { total: '0', payouts: [], source: 'subquery', completeness: 'complete' };

const renderCell = (override: { data: UnclaimedPayouts; pending: boolean } | null = null) => {
  const scope = fork({ values: [[$unclaimedPayoutsOverride, override]] });

  return render(
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <UnclaimedCell row={row} />
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );
};

const UNCLAIMED_UNKNOWN = "Unclaimed rewards couldn't be fully checked on this network.";

describe('features/dashboard-staking-positions/ui/UnclaimedCell', () => {
  it('SP-45: explains the dash when the scan could not look everywhere', async () => {
    renderCell();

    const dash = await screen.findByText('—');
    // The Radix trigger wraps the dash; it carries the tooltip state.
    const trigger = dash.parentElement!;
    expect(trigger).toHaveAttribute('data-state', 'closed');

    fireEvent.focus(trigger);

    expect(await screen.findByRole('tooltip')).toHaveTextContent(UNCLAIMED_UNKNOWN);
  });

  it('SP-45: leaves the dash alone once a complete scan found nothing', async () => {
    renderCell({ data: COMPLETE_EMPTY, pending: false });

    const dash = await screen.findByText('—');
    expect(dash.parentElement).not.toHaveAttribute('data-state');

    fireEvent.focus(dash.parentElement!);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.queryByText(UNCLAIMED_UNKNOWN)).not.toBeInTheDocument();
  });
});
