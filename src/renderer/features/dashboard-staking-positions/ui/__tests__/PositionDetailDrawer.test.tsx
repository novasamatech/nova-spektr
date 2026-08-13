import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createWatch, fork } from 'effector';
import { Provider } from 'effector-react';

import { WalletType } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { createAccountId, dotAsset, polkadotAssetHubChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ThemeProvider } from '@/shared/ui-kit';
import { type StakingPosition } from '@/domains/staking';
import { type PositionRow } from '../../lib';
import { positionActions } from '../../model/position-actions';
import { PositionDetailDrawer } from '../PositionDetailDrawer';

const accountId = createAccountId('stash') as AccountId;

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
};

const row: PositionRow = {
  id: `${polkadotAssetHubChain.chainId}-${accountId}`,
  position,
  accountId,
  chain: polkadotAssetHubChain,
  asset: dotAsset,
  account: null,
  wallet: null,
  accessMode: 'direct',
  multisig: null,
  status: 'active',
  staked: '1000000000000',
  sharePercent: 100,
  apy: null,
  activeValidatorCount: 0,
  nominationCount: 0,
  draftCount: 0,
};

const renderDrawer = (drawerRow: PositionRow = row) => {
  const scope = fork({ values: [[positionActions.$wiredActions, ['changeValidators']]] });

  return render(
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <PositionDetailDrawer row={drawerRow} onClose={() => {}} />
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );
};

const validatorRow: PositionRow = {
  ...row,
  position: {
    ...position,
    kind: 'validator',
    validator: {
      commission: 5,
      blocked: false,
      ownStake: '1000',
      totalExposure: '5000',
      nominatorCount: 12,
      eraPoints: 340,
    },
    nominations: [],
    activeValidators: [],
    status: 'active',
  },
};

const renderValidatorDrawer = () => {
  const scope = fork({ values: [[positionActions.$wiredActions, ['changeValidators']]] });

  return render(
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <PositionDetailDrawer row={validatorRow} onClose={() => {}} />
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );
};

describe('features/dashboard-staking-positions/ui/PositionDetailDrawer', () => {
  test('should badge a contact position as Address book, never Local wallet', async () => {
    // `wallet: null` is the fact the badge states — nothing local holds the
    // account, it is known from the address book alone.
    renderDrawer({ ...row, account: null, wallet: null, accessMode: 'draft' });

    expect(await screen.findByText('Address book')).toBeInTheDocument();
    expect(screen.queryByText('Local wallet')).not.toBeInTheDocument();
  });

  test('should badge a position held by a local wallet as Local wallet', async () => {
    const wallet = { id: 1, name: 'My Vault', type: WalletType.POLKADOT_VAULT, accounts: [] };

    renderDrawer({ ...row, wallet, accessMode: 'direct' });

    expect(await screen.findByText('Local wallet')).toBeInTheDocument();
    expect(screen.queryByText('Address book')).not.toBeInTheDocument();
  });

  test('should keep the view only badge for a watch-only position', async () => {
    const wallet = { id: 2, name: 'Watching', type: WalletType.WATCH_ONLY, accounts: [] };

    renderDrawer({ ...row, wallet, accessMode: 'watchOnly' });

    expect(await screen.findByText('view only')).toBeInTheDocument();
    expect(screen.queryByText('Local wallet')).not.toBeInTheDocument();
    expect(screen.queryByText('Address book')).not.toBeInTheDocument();
  });

  test('should show validator stats instead of nominations for a validator position', async () => {
    renderValidatorDrawer();

    expect(await screen.findByText('Validator')).toBeInTheDocument();
    expect(screen.queryByText('Nominations')).not.toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'Change validators' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add stake' })).toBeInTheDocument();

    expect(screen.getAllByText('12 nominators').length).toBeGreaterThan(0);
  });

  test('should acknowledge the change-validators click with a spinner, then hand off', async () => {
    const requested: unknown[] = [];
    const unwatch = createWatch({
      unit: positionActions.events.changeValidatorsRequested,
      fn: (payload) => requested.push(payload),
    });

    renderDrawer();

    const chip = await screen.findByRole('button', { name: 'Change validators' });
    expect(chip).toBeEnabled();
    // `fireEvent`, not `userEvent`: the awaited click lets jsdom's 16ms
    // `requestAnimationFrame` timers run, and the spinner state is over before
    // it can be observed. The synchronous click leaves the deferred frames
    // pending.
    fireEvent.click(chip);

    // The spinner lands in the chip's prefix slot on the very click...
    expect(chip.querySelector('[data-testid="prefix"]')).toBeInTheDocument();
    expect(requested).toHaveLength(0);

    // ...and the handoff itself is deferred until that frame has painted.
    await waitFor(() => expect(requested).toHaveLength(1));
    expect(requested[0]).toMatchObject({ chain: polkadotAssetHubChain, signingMode: 'local' });
    expect(chip.querySelector('[data-testid="prefix"]')).not.toBeInTheDocument();

    unwatch();
  });
});
