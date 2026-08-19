import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type StakingPosition } from '@/domains/staking';
import { stakingPositions } from '@/aggregates/staking-positions';
import { confirmFlowModel } from '@/features/staking-confirm-flow/model/confirm-flow';
import { type RedeemTarget } from '@/features/staking-confirm-flow/types';
import { polkadotAssetHubChain, polkadotAssetHubChainId, stakingAccountA, stakingWallet } from '../../fixtures/index';
import {
  type StakingScenario,
  allureMetadata,
  createStakingApi,
  createStakingScenario,
  nextStakingEra,
} from '../../utils/index';

/**
 * The redeem confirm opens on a snapshot, and the snapshot is allowed to go
 * stale for DISPLAY — but not for signing. The sign gate reads the LIVE
 * redeemable from the staking-positions aggregate: a ledger with nothing
 * unlocked left makes `withdraw_unbonded` a paid no-op, so Sign is blocked and
 * the state is named. A live figure that merely differs from the snapshot is
 * fine — the call takes no amount and withdraws whatever is unlocked.
 *
 * The whole chain runs live here: pooled resources, `positionsService`
 * derivation, the aggregate and the flow's gate, over a mock Asset Hub api.
 *
 * @group integration
 * @group staking
 * @group staking-confirm-flow
 */

const ERA_START_MS = 1_700_000_000_000;

/** The figure the dashboard had in hand when the button was pressed. */
const SNAPSHOT_REDEEMABLE = '1000000000';

function createSnapshotPosition(accountId: AccountId): StakingPosition {
  return {
    accountId,
    chainId: polkadotAssetHubChainId,
    stake: {
      accountId,
      chainId: polkadotAssetHubChainId,
      controller: accountId,
      stash: accountId,
      active: '1000000000000',
      total: '1001000000000',
      unlocking: [],
    },
    status: 'active',
    statusReason: null,
    kind: 'nominator',
    validator: null,
    nominations: [],
    activeValidators: [],
    unbonding: [],
    redeemable: SNAPSHOT_REDEEMABLE,
    totalUnbonding: '0',
  };
}

function createRedeemTarget(): RedeemTarget {
  return {
    position: createSnapshotPosition(stakingAccountA.accountId),
    chain: polkadotAssetHubChain,
    asset: polkadotAssetHubChain.assets[0]!,
    account: stakingAccountA,
    wallet: stakingWallet,
    amount: SNAPSHOT_REDEEMABLE,
    signingMode: 'local',
  };
}

describe('Staking Confirm Flow - Live Redeemable Gate', () => {
  let scenario: StakingScenario | null = null;

  beforeEach(async () => {
    await allureMetadata({
      epic: 'Staking',
      feature: 'Confirm Flow',
      story: 'Live redeemable gate',
      severity: 'critical',
    });
  });

  // The resource pools are module-level and ref-counted, so a key left started
  // outlives the scope it was started in and poisons the next test.
  afterEach(async () => {
    if (scenario) {
      await scenario.env.executeEventVoid(confirmFlowModel.flowClosed);
      await scenario.env.executeEventVoid(stakingPositions.reset);
      await scenario.env.cleanup();
      scenario = null;
    }
  });

  const startScenario = async (ledger: { unlocking: { value: string; era: number }[] } | null, era: number) => {
    const handle = createStakingApi({
      chainId: polkadotAssetHubChainId,
      activeEra: { index: era, startMs: ERA_START_MS },
      ledgers: {
        [stakingAccountA.accountId]: ledger
          ? { total: '1001000000000', active: '1000000000000', unlocking: ledger.unlocking }
          : null,
      },
      nominations: { [stakingAccountA.accountId]: null },
    });

    scenario = await createStakingScenario({
      chains: [polkadotAssetHubChain],
      accounts: [stakingAccountA],
      apis: { [polkadotAssetHubChainId]: handle.api },
    });

    await scenario.settle();

    return { handle, env: scenario.env, settle: scenario.settle };
  };

  it('should block Sign when the live ledger has nothing redeemable behind the snapshot', async () => {
    const era = nextStakingEra();
    // The only chunk is still unbonding — live redeemable is zero even though
    // the snapshot the confirm leads with says otherwise.
    const { env } = await startScenario({ unlocking: [{ value: SNAPSHOT_REDEEMABLE, era: era + 5 }] }, era);

    await env.executeEvent(confirmFlowModel.redeemRequested, createRedeemTarget());

    expect(env.getState(confirmFlowModel.$hasSomethingToDo)).toBe(false);
    expect(env.getState(confirmFlowModel.$canSign)).toBe(false);
    expect(env.getState(confirmFlowModel.$nothingLeftToRedeem)).toBe(true);
    // The DISPLAYED figure stays the snapshot — only the gate is live.
    expect(env.getState(confirmFlowModel.$amount)).toBe(SNAPSHOT_REDEEMABLE);
  });

  it('should not gate on a live figure that merely differs from the snapshot', async () => {
    const era = nextStakingEra();
    // Unlocked, but not the figure the confirm was opened with —
    // `withdraw_unbonded` takes no amount, so this is still signable.
    const { env } = await startScenario({ unlocking: [{ value: '777000000', era: era - 1 }] }, era);

    await env.executeEvent(confirmFlowModel.redeemRequested, createRedeemTarget());

    expect(env.getState(confirmFlowModel.$hasSomethingToDo)).toBe(true);
    expect(env.getState(confirmFlowModel.$nothingLeftToRedeem)).toBe(false);
  });

  it('should open the gate when the era advances under the open confirm', async () => {
    const era = nextStakingEra();
    const { handle, env, settle } = await startScenario(
      { unlocking: [{ value: SNAPSHOT_REDEEMABLE, era: era + 5 }] },
      era,
    );

    await env.executeEvent(confirmFlowModel.redeemRequested, createRedeemTarget());
    expect(env.getState(confirmFlowModel.$hasSomethingToDo)).toBe(false);

    // The chunk's era arrives while the confirm is on screen.
    handle.setActiveEra(era + 5, ERA_START_MS);
    handle.emit();
    await settle();

    expect(env.getState(confirmFlowModel.$hasSomethingToDo)).toBe(true);
    expect(env.getState(confirmFlowModel.$nothingLeftToRedeem)).toBe(false);
  });

  it('should treat a position gone from the settled aggregate as nothing to redeem', async () => {
    const era = nextStakingEra();
    // The ledger was closed out entirely — the aggregate has answered and holds
    // no position, which is a zero, not a load to keep waiting on.
    const { env } = await startScenario(null, era);

    await env.executeEvent(confirmFlowModel.redeemRequested, createRedeemTarget());

    expect(env.getState(confirmFlowModel.$hasSomethingToDo)).toBe(false);
    expect(env.getState(confirmFlowModel.$canSign)).toBe(false);
    expect(env.getState(confirmFlowModel.$nothingLeftToRedeem)).toBe(true);
  });

  it('should hold Sign without raising the alert while the aggregate is still loading', async () => {
    // No api pushed: the chain is connected but nothing has answered yet — the
    // old form's era-loading hold, not the stale-snapshot state.
    scenario = await createStakingScenario({
      chains: [polkadotAssetHubChain],
      accounts: [stakingAccountA],
      apis: {},
    });
    await scenario.settle();

    await scenario.env.executeEvent(confirmFlowModel.redeemRequested, createRedeemTarget());

    expect(scenario.env.getState(stakingPositions.$pending)).toBe(true);
    expect(scenario.env.getState(confirmFlowModel.$hasSomethingToDo)).toBe(false);
    expect(scenario.env.getState(confirmFlowModel.$canSign)).toBe(false);
    expect(scenario.env.getState(confirmFlowModel.$nothingLeftToRedeem)).toBe(false);
  });
});
