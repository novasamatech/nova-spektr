import { allSettled } from 'effector';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionType } from '@/shared/core';
import { AssetHubChains } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { stakingPositions } from '@/aggregates/staking-positions';
import {
  kusamaAssetHubChain,
  polkadotAssetHubChain,
  stakingAccountA,
  stakingAccountB,
  stakingKusamaOnlyAccount,
  westendAssetHubChain,
} from '../../fixtures/index';
import {
  type StakingScenario,
  allureMetadata,
  createStakingApi,
  createStakingScenario,
  nextStakingEra,
} from '../../utils/index';

/**
 * The staking dashboard is multi-chain: the chains it works on are the
 * intersection of `AssetHubChains` with the running network config, never a
 * hardcoded pair. Westend Asset Hub exists only in dev configs, so it is the
 * canary for that rule.
 *
 * @group integration
 * @group staking
 * @group staking-chain-scope
 */

const POLKADOT_AH = AssetHubChains.POLKADOT_AH;
const KUSAMA_AH = AssetHubChains.KUSAMA_AH;
const WESTEND_AH = AssetHubChains.WESTEND_AH;

const ERA_START_MS = 1_700_000_000_000;

describe('Staking Chain Scope - Integration', () => {
  let scenario: StakingScenario | null = null;

  beforeEach(async () => {
    await allureMetadata({
      epic: 'Staking',
      feature: 'Staking Positions',
      story: 'Multi-chain scope',
      severity: 'critical',
    });
  });

  afterEach(async () => {
    if (scenario) {
      await scenario.env.executeEventVoid(stakingPositions.reset);
      await scenario.env.cleanup();
      scenario = null;
    }
  });

  const startScenario = async (params: Parameters<typeof createStakingScenario>[0]) => {
    scenario = await createStakingScenario(params);

    return scenario;
  };

  it('should skip a staking chain the network config does not carry', async () => {
    const polkadot = createStakingApi({
      chainId: POLKADOT_AH,
      activeEra: { index: nextStakingEra(), startMs: ERA_START_MS },
    });

    const { env, settle } = await startScenario({
      chains: [polkadotAssetHubChain],
      apis: { [POLKADOT_AH]: polkadot.api },
    });

    await settle();

    expect(env.getState(stakingPositions.$stakingChains).map((chain) => chain.chainId)).toEqual([POLKADOT_AH]);
    expect(env.getState(stakingPositions.$chainAccounts).map((entry) => entry.chainId)).toEqual([POLKADOT_AH]);
  });

  it('should pick up Westend Asset Hub as soon as the config carries it', async () => {
    const polkadot = createStakingApi({
      chainId: POLKADOT_AH,
      activeEra: { index: nextStakingEra(), startMs: ERA_START_MS },
    });

    const { env, settle } = await startScenario({
      chains: [polkadotAssetHubChain],
      apis: { [POLKADOT_AH]: polkadot.api },
    });

    await settle();
    expect(env.getState(stakingPositions.$stakingChains).map((chain) => chain.chainId)).toEqual([POLKADOT_AH]);

    // A dev config lands, exactly as it does when the chains file is swapped.
    await allSettled(networkModel.$chains, {
      scope: env.scope,
      params: {
        [POLKADOT_AH]: polkadotAssetHubChain,
        [WESTEND_AH]: westendAssetHubChain,
      },
    });

    expect(env.getState(stakingPositions.$stakingChains).map((chain) => chain.chainId)).toEqual([
      POLKADOT_AH,
      WESTEND_AH,
    ]);
  });

  it('should ignore chains that are not Asset Hubs even when they are connected', async () => {
    const polkadot = createStakingApi({
      chainId: POLKADOT_AH,
      activeEra: { index: nextStakingEra(), startMs: ERA_START_MS },
    });

    const { env, settle } = await startScenario({
      chains: [polkadotAssetHubChain],
      apis: { [POLKADOT_AH]: polkadot.api },
    });

    await settle();

    // The Polkadot relay chain is where staking used to live — it must not come
    // back into scope just because it is in the config.
    const relayChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
    await allSettled(networkModel.$chains, {
      scope: env.scope,
      params: {
        [POLKADOT_AH]: polkadotAssetHubChain,
        [relayChainId]: { ...polkadotAssetHubChain, chainId: relayChainId, name: 'Polkadot' },
      },
    });

    expect(env.getState(stakingPositions.$stakingChains).map((chain) => chain.chainId)).toEqual([POLKADOT_AH]);
  });

  it('should not request a chain that has no connected api', async () => {
    const era = nextStakingEra();
    const kusama = createStakingApi({
      chainId: KUSAMA_AH,
      activeEra: { index: era, startMs: ERA_START_MS },
      ledgers: { [stakingAccountA.accountId]: { total: '500', active: '500' } },
    });

    // Polkadot Asset Hub is configured but its node never connected.
    const { env, settle } = await startScenario({
      chains: [polkadotAssetHubChain, kusamaAssetHubChain],
      apis: { [KUSAMA_AH]: kusama.api },
    });

    await settle();

    expect(env.getState(stakingPositions.$stakingChains).map((chain) => chain.chainId)).toEqual([
      POLKADOT_AH,
      KUSAMA_AH,
    ]);
    // Only the connected chain produced positions and subscriptions.
    expect(env.getState(stakingPositions.$positions).map((position) => position.chainId)).toEqual([KUSAMA_AH]);
    expect(kusama.liveSubscriptions().ledger).toBe(1);
  });

  it('should only offer a chain-scoped account to its own chain', async () => {
    const era = nextStakingEra();
    const polkadot = createStakingApi({ chainId: POLKADOT_AH, activeEra: { index: era, startMs: ERA_START_MS } });
    const kusama = createStakingApi({ chainId: KUSAMA_AH, activeEra: { index: era, startMs: ERA_START_MS } });

    const { env, settle } = await startScenario({
      chains: [polkadotAssetHubChain, kusamaAssetHubChain],
      accounts: [stakingAccountA, stakingKusamaOnlyAccount],
      apis: { [POLKADOT_AH]: polkadot.api, [KUSAMA_AH]: kusama.api },
    });

    await settle();

    const chainAccounts = env.getState(stakingPositions.$chainAccounts);
    const polkadotAccounts = chainAccounts.find((entry) => entry.chainId === POLKADOT_AH)?.accountIds;
    const kusamaAccounts = chainAccounts.find((entry) => entry.chainId === KUSAMA_AH)?.accountIds;

    expect(polkadotAccounts).toEqual([stakingAccountA.accountId]);
    expect(kusamaAccounts).toEqual([stakingAccountA.accountId, stakingKusamaOnlyAccount.accountId]);
  });

  it('should keep the dashboard pending while a configured chain has not answered yet', async () => {
    const era = nextStakingEra();
    const polkadot = createStakingApi({
      chainId: POLKADOT_AH,
      activeEra: { index: era, startMs: ERA_START_MS },
      ledgers: { [stakingAccountA.accountId]: null, [stakingAccountB.accountId]: null },
    });

    const { env, settle } = await startScenario({
      chains: [polkadotAssetHubChain, kusamaAssetHubChain],
      apis: { [POLKADOT_AH]: polkadot.api },
    });

    await settle();

    // Polkadot answered "nothing staked here"; Kusama has accounts but no api
    // yet, which is a chain still loading rather than a chain with no answer.
    expect(env.getState(stakingPositions.$pending)).toBe(true);
  });

  it('should not let a disabled chain hold the dashboard pending forever', async () => {
    const era = nextStakingEra();
    const polkadot = createStakingApi({
      chainId: POLKADOT_AH,
      activeEra: { index: era, startMs: ERA_START_MS },
      ledgers: { [stakingAccountA.accountId]: null, [stakingAccountB.accountId]: null },
    });

    const { env, settle } = await startScenario({
      chains: [polkadotAssetHubChain, kusamaAssetHubChain],
      apis: { [POLKADOT_AH]: polkadot.api },
    });

    await allSettled(networkModel.$connections, {
      scope: env.scope,
      params: {
        [KUSAMA_AH]: {
          id: 1,
          chainId: KUSAMA_AH,
          connectionType: ConnectionType.DISABLED,
          customNodes: [],
        },
      },
    });
    await settle();

    // A chain the user switched off will never answer — it must not spin.
    expect(env.getState(stakingPositions.$pending)).toBe(false);
  });
});
