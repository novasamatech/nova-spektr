import { act, fireEvent, render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { describe, expect, it, vi } from 'vitest';

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
import { type ChainEraReward, type ValidatorRewardsResult } from '../../hooks/useValidatorRewards';
import { type ClaimRow } from '../../lib/types';
import { ClaimModal } from '../ClaimModal';

/**
 * The era attribution, the indexer's payout rows and the price feed are the
 * boundaries of this screen; what it says about the payout scan is read off the
 * claim rows it is handed, which is the real path under test.
 */
const rewardsState = vi.hoisted(() => {
  const state: { current: ValidatorRewardsResult } = { current: { rewards: [], pendingChains: [] } };

  return state;
});

vi.mock('../../hooks/useValidatorRewards', () => ({ useValidatorRewards: () => rewardsState.current }));
vi.mock('../../hooks/useRawRewardPayouts', () => ({ useRawRewardPayouts: () => [] }));
vi.mock('../../hooks/useStakingChainAssets', () => ({
  useStakingChainAssets: () => ({
    byChain: {},
    chains: [],
    currency: null,
    fiatFlag: false,
    pricesReady: false,
    toFiat: () => '0',
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
const NOTHING_TO_CLAIM = `Nothing outstanding — every payout of the last ${HISTORY_DEPTH} eras is claimed.`;

describe('features/dashboard-staking-kpi/ui/ClaimModal · payout scan', () => {
  it('SP-43: reports an incomplete scan instead of nothing outstanding', async () => {
    rewardsState.current = { rewards: [polkadotReward], pendingChains: [] };

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
    rewardsState.current = { rewards: [polkadotReward], pendingChains: [] };

    renderModal([claimRow(polkadotAssetHubChain, 'complete'), claimRow(kusamaAssetHubChain, 'complete')]);

    expect(await screen.findByText(NOTHING_TO_CLAIM)).toBeInTheDocument();
    expect(screen.queryByText(SCAN_INCOMPLETE)).not.toBeInTheDocument();
    expect(screen.queryByText("Couldn't check")).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('SP-44: Retry shows loading while the scans re-run, then the footer settles on the complete answer', async () => {
    rewardsState.current = { rewards: [polkadotReward], pendingChains: [] };

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
