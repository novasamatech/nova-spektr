import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Chain, type ChainId } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import {
  createAccountId,
  kusamaAssetHubChainId,
  kusamaChain,
  kusamaChainId,
  polkadotAssetHubChain,
} from '@/shared/mocks';
import { ThemeProvider } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { type RawRewardPayouts } from '../../hooks/useRawRewardPayouts';
import { type ChainEraReward, type ValidatorRewardsResult } from '../../hooks/useValidatorRewards';
import { type ClaimRow } from '../../lib/types';
import { ClaimModal } from '../ClaimModal';

/**
 * The era attribution, the indexer's payout rows and the price feed are the
 * boundaries of this screen; what it says about the payout scan is read off the
 * claim rows it is handed, which is the real path under test.
 */
const rewardsState = vi.hoisted(() => {
  const state: { current: ValidatorRewardsResult } = {
    current: {
      rewards: [],
      pendingChains: [],
      incompleteChains: [],
      unavailableChains: [],
      retry: () => Promise.resolve(),
    },
  };

  return state;
});

const payoutsState = vi.hoisted(() => {
  const state: { current: RawRewardPayouts } = {
    current: { rows: [], incompleteChains: [], pendingChains: [], retry: () => Promise.resolve() },
  };

  return state;
});

/**
 * What each planck amount is worth — nothing, unless a test needs the donut
 * drawn.
 */
const fiatState = vi.hoisted(() => ({ value: '0' }));

vi.mock('../../hooks/useValidatorRewards', () => ({ useValidatorRewards: () => rewardsState.current }));
vi.mock('../../hooks/useRawRewardPayouts', () => ({ useRawRewardPayouts: () => payoutsState.current }));
vi.mock('../../hooks/useStakingChainAssets', () => ({
  useStakingChainAssets: () => ({
    byChain: {},
    chains: [],
    currency: null,
    fiatFlag: false,
    pricesReady: false,
    toFiat: () => fiatState.value,
  }),
}));

const POLKADOT_AH = polkadotAssetHubChain.chainId;
const KUSAMA_AH = kusamaAssetHubChainId;

const kusamaAssetHubChain: Chain = {
  ...kusamaChain,
  chainId: KUSAMA_AH,
  parentId: kusamaChainId,
  name: 'Kusama Asset Hub',
};

const chains: Record<ChainId, Chain> = {
  [POLKADOT_AH]: polkadotAssetHubChain,
  [KUSAMA_AH]: kusamaAssetHubChain,
};

const stash = createAccountId('claim-modal-stash');
const validator = createAccountId('claim-modal-validator');

const HISTORY_DEPTH = 84;

const claimRow = (chain: Chain, unclaimedStatus: ClaimRow['unclaimedStatus']): ClaimRow => ({
  key: `${chain.chainId}:${stash}`,
  accountId: stash,
  chainId: chain.chainId,
  chainName: chain.name,
  symbol: chain.assets[0]!.symbol,
  precision: chain.assets[0]!.precision,
  earned: '0',
  unclaimed: '0',
  unclaimedStatus,
  unclaimedFiat: '0',
  eras: [],
  payouts: [],
});

/** A validator the Polkadot stash earned from — the row the table shows. */
const polkadotReward: ChainEraReward = {
  chainId: POLKADOT_AH,
  era: 99,
  validator,
  accountId: stash,
  amount: '1000000000',
  isSelf: false,
};

const noRetry = () => Promise.resolve();

/** What the era attribution answered, and for which chains only in part. */
const earned = (
  rewards: ChainEraReward[],
  incompleteChains: ChainId[] = [],
  retry: () => Promise<void> = noRetry,
  unavailableChains: ChainId[] = [],
): ValidatorRewardsResult => ({ rewards, pendingChains: [], incompleteChains, unavailableChains, retry });

const renderModal = (rows: ClaimRow[], onRetryUnclaimed: () => Promise<void> = () => Promise.resolve()) => {
  const scope = fork({ values: [[networkModel.$chains, chains]] });

  const ui = (modalRows: ClaimRow[]) => (
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <ClaimModal
            rows={modalRows}
            positions={[]}
            currency={null}
            eras={{ [POLKADOT_AH]: 100, [KUSAMA_AH]: 200 }}
            eraDurations={{}}
            historyDepths={{ [POLKADOT_AH]: HISTORY_DEPTH, [KUSAMA_AH]: HISTORY_DEPTH }}
            walletByAccount={{}}
            onRetryUnclaimed={onRetryUnclaimed}
            onClose={() => {}}
          />
        </ThemeProvider>
      </I18Provider>
    </Provider>
  );

  const result = render(ui(rows));

  return { ...result, rerenderWith: (modalRows: ClaimRow[]) => result.rerender(ui(modalRows)) };
};

const SCAN_INCOMPLETE = "Couldn't check every payout on Polkadot Asset Hub — unclaimed rewards may be missing.";
const INCOMPLETE_TOTAL = 'Incomplete';
/** The donut centre: one slice worth 5 in a currency-less view. */
const CENTRE_TOTAL = '5';
const NOTHING_TO_CLAIM = `Nothing outstanding — every payout of the last ${HISTORY_DEPTH} eras is claimed.`;

describe('features/dashboard-staking-kpi/ui/ClaimModal · payout scan', () => {
  beforeEach(() => {
    payoutsState.current = { rows: [], incompleteChains: [], pendingChains: [], retry: noRetry };
  });

  it('SP-43: reports an incomplete scan instead of nothing outstanding', async () => {
    rewardsState.current = earned([polkadotReward]);

    renderModal([claimRow(polkadotAssetHubChain, 'partial'), claimRow(kusamaAssetHubChain, 'complete')]);

    // The footer names the one network whose scan fell short — Kusama answered
    // in full and is not blamed.
    expect(await screen.findByText(SCAN_INCOMPLETE)).toBeInTheDocument();
    expect(screen.queryByText(NOTHING_TO_CLAIM)).not.toBeInTheDocument();

    // The validator row found nothing unclaimed, but the scan could not look
    // everywhere, so its cell says so rather than printing `0 DOT`.
    expect(screen.getByText("Couldn't check")).toBeInTheDocument();
    expect(screen.queryByText('0 DOT')).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
  });

  it('SP-43: says nothing outstanding only after every scan answered completely', async () => {
    rewardsState.current = earned([polkadotReward]);

    renderModal([claimRow(polkadotAssetHubChain, 'complete'), claimRow(kusamaAssetHubChain, 'complete')]);

    expect(await screen.findByText(NOTHING_TO_CLAIM)).toBeInTheDocument();
    expect(screen.queryByText(SCAN_INCOMPLETE)).not.toBeInTheDocument();
    expect(screen.queryByText("Couldn't check")).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('SP-44: Retry shows loading while the scans re-run, then the footer settles on the complete answer', async () => {
    rewardsState.current = earned([polkadotReward]);

    let finishRetry: () => void = () => {};
    const onRetryUnclaimed = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishRetry = resolve;
        }),
    );

    const { rerenderWith } = renderModal(
      [claimRow(polkadotAssetHubChain, 'partial'), claimRow(kusamaAssetHubChain, 'complete')],
      onRetryUnclaimed,
    );

    const retry = await screen.findByRole('button', { name: 'Retry' });
    fireEvent.click(retry);

    expect(onRetryUnclaimed).toHaveBeenCalledTimes(1);
    expect(retry).toBeDisabled();

    await act(async () => {
      finishRetry();
    });
    rerenderWith([claimRow(polkadotAssetHubChain, 'complete'), claimRow(kusamaAssetHubChain, 'complete')]);

    expect(await screen.findByText(NOTHING_TO_CLAIM)).toBeInTheDocument();
    expect(screen.queryByText(SCAN_INCOMPLETE)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});

const EARNED_INCOMPLETE = "Earned figures on Polkadot Asset Hub are incomplete — some era data couldn't be loaded.";
const NOTHING_IN_PERIOD = 'No rewards attributed in this window.';

describe('features/dashboard-staking-kpi/ui/ClaimModal · earned attribution', () => {
  beforeEach(() => {
    payoutsState.current = { rows: [], incompleteChains: [], pendingChains: [], retry: noRetry };
  });

  it('reports an incomplete attribution instead of nothing earned', async () => {
    rewardsState.current = earned([], [POLKADOT_AH]);

    renderModal([claimRow(polkadotAssetHubChain, 'complete')]);

    expect(await screen.findByText(EARNED_INCOMPLETE)).toBeInTheDocument();
    expect(screen.queryByText(NOTHING_IN_PERIOD)).not.toBeInTheDocument();
  });

  it('says nothing was earned only after the attribution answered completely', async () => {
    rewardsState.current = earned([]);

    renderModal([claimRow(polkadotAssetHubChain, 'complete')]);

    expect(await screen.findByText(NOTHING_IN_PERIOD)).toBeInTheDocument();
    expect(screen.queryByText(EARNED_INCOMPLETE)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('keeps what a partial attribution found and says the figures are incomplete', async () => {
    rewardsState.current = earned([polkadotReward], [POLKADOT_AH]);

    renderModal([claimRow(polkadotAssetHubChain, 'complete')]);

    // The amount that was worked out is real, so it stays — next to the note
    // that it is not the whole of it.
    expect(await screen.findByText('0.1 DOT')).toBeInTheDocument();
    expect(screen.getByText(EARNED_INCOMPLETE)).toBeInTheDocument();
  });

  it('does not print a zero for a validator whose earnings could not be worked out', async () => {
    rewardsState.current = earned([], [POLKADOT_AH]);

    // The row exists because something is unclaimed on it; what it earned is
    // what the attribution could not answer.
    const row: ClaimRow = {
      ...claimRow(polkadotAssetHubChain, 'complete'),
      unclaimed: '20000000000',
      eras: [99],
      payouts: [{ era: 99, validator, page: 0, amount: '20000000000' }],
    };

    renderModal([row]);

    expect(await screen.findByText('2 DOT')).toBeInTheDocument();
    expect(screen.getAllByText("Couldn't load").length).toBeGreaterThan(0);
    expect(screen.queryByText('0 DOT')).not.toBeInTheDocument();
  });

  describe('donut centre', () => {
    beforeEach(() => {
      // A slice needs a value to be drawn, and the centre needs the donut.
      fiatState.value = '5';
    });

    afterEach(() => {
      fiatState.value = '0';
    });

    /** The text in the middle of the donut, next to the validator count. */
    const centre = async () => {
      const count = await screen.findByText('1 validator');

      return within(count.parentElement!);
    };

    it('shows the centre total plainly once every attribution answered completely', async () => {
      rewardsState.current = earned([polkadotReward]);

      renderModal([claimRow(polkadotAssetHubChain, 'complete')]);

      const middle = await centre();
      expect(middle.getByText(CENTRE_TOTAL)).toBeInTheDocument();
      expect(middle.queryByText(INCOMPLETE_TOTAL)).not.toBeInTheDocument();
    });

    it('marks the centre total itself as incomplete when an attribution answered in part', async () => {
      rewardsState.current = earned([polkadotReward], [POLKADOT_AH]);

      renderModal([claimRow(polkadotAssetHubChain, 'complete')]);

      const middle = await centre();
      expect(middle.getByText(CENTRE_TOTAL)).toBeInTheDocument();
      expect(middle.getByText(INCOMPLETE_TOTAL)).toBeInTheDocument();
    });

    it('says the centre total could not be loaded when no network on screen could be attributed', async () => {
      rewardsState.current = earned([polkadotReward], [POLKADOT_AH], noRetry, [POLKADOT_AH]);

      renderModal([claimRow(polkadotAssetHubChain, 'complete')]);

      const middle = await centre();
      expect(middle.getByText("Couldn't load")).toBeInTheDocument();
      expect(middle.queryByText(CENTRE_TOTAL)).not.toBeInTheDocument();
    });
  });

  it('Retry re-runs the attribution that did not answer completely', async () => {
    const retryEarned = vi.fn(noRetry);
    const onRetryUnclaimed = vi.fn(noRetry);
    rewardsState.current = earned([], [POLKADOT_AH], retryEarned);

    renderModal([claimRow(polkadotAssetHubChain, 'complete')], onRetryUnclaimed);

    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));

    expect(retryEarned).toHaveBeenCalledTimes(1);
    await act(async () => {});
  });
});

describe('features/dashboard-staking-kpi/ui/ClaimModal · payout export', () => {
  it('does not export a payout history that is missing rows', async () => {
    const retryHistory = vi.fn(noRetry);
    rewardsState.current = earned([polkadotReward]);
    payoutsState.current = { rows: [], incompleteChains: [POLKADOT_AH], pendingChains: [], retry: retryHistory };

    renderModal([claimRow(polkadotAssetHubChain, 'complete')]);

    expect(await screen.findByRole('button', { name: 'Export CSV' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retryHistory).toHaveBeenCalledTimes(1);
    await act(async () => {});
  });

  it('does not export while a network payout history has not arrived', async () => {
    rewardsState.current = earned([polkadotReward]);
    payoutsState.current = { rows: [], incompleteChains: [], pendingChains: [POLKADOT_AH], retry: noRetry };

    renderModal([claimRow(polkadotAssetHubChain, 'complete')]);

    expect(await screen.findByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('exports once the payout history answered completely', async () => {
    rewardsState.current = earned([polkadotReward]);
    payoutsState.current = { rows: [], incompleteChains: [], pendingChains: [], retry: noRetry };

    renderModal([claimRow(polkadotAssetHubChain, 'complete')]);

    expect(await screen.findByRole('button', { name: 'Export CSV' })).toBeEnabled();
  });
});
