import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createWatch, fork } from 'effector';
import { Provider } from 'effector-react';

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

const renderDrawer = () => {
  const scope = fork({ values: [[positionActions.$wiredActions, ['changeValidators']]] });

  return render(
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <PositionDetailDrawer row={row} onClose={() => {}} />
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );
};

describe('features/dashboard-staking-positions/ui/PositionDetailDrawer', () => {
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
