import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionStatus } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { type StakingPosition } from '@/domains/staking';
import { walletModel } from '@/entities/wallet';
import { amountFlowModel } from '@/features/staking-amount-flow/model/amount-flow';
import { type AmountFlowTarget } from '@/features/staking-amount-flow/types';
import { polkadotAssetHubChain, polkadotAssetHubChainId, stakingAccountA, stakingWallet } from '../../fixtures/index';
import {
  type FeatureTestEnvironment,
  FeatureTestBuilder,
  allureMetadata,
  seedAccountHandlers,
} from '../../utils/index';

/**
 * The dashboard flows must not build a transaction against a chain that is not
 * connected: a stale or absent api prices no fee and signs nothing, so the call
 * would strand the confirm — or worse, be built from stale state. `$coreTx` is
 * gated on the chain's connection status, exactly like the old staking forms.
 *
 * @group integration
 * @group staking
 * @group staking-amount-flow
 */

function createPosition(accountId: AccountId): StakingPosition {
  return {
    accountId,
    chainId: polkadotAssetHubChainId,
    stake: {
      accountId,
      chainId: polkadotAssetHubChainId,
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
    payee: null,
    payeeLoaded: false,
  };
}

function createTarget(): AmountFlowTarget {
  return {
    position: createPosition(stakingAccountA.accountId),
    chain: polkadotAssetHubChain,
    asset: polkadotAssetHubChain.assets[0]!,
    account: stakingAccountA,
    wallet: stakingWallet,
    signingMode: 'local',
  };
}

describe('Staking Amount Flow - Chain Connection Guard', () => {
  let env: FeatureTestEnvironment;

  beforeEach(async () => {
    await allureMetadata({
      epic: 'Staking',
      feature: 'Amount Flow',
      story: 'Chain connection guard',
      severity: 'critical',
    });
  });

  afterEach(async () => {
    if (env) {
      await env.executeEventVoid(amountFlowModel.flowClosed);
      await env.cleanup();
    }
  });

  async function buildEnv(status: ConnectionStatus) {
    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withChain(polkadotAssetHubChain)
      .withConnectionStatus(polkadotAssetHubChainId, status)
      .withStoreValue(walletModel.__test.$rawWallets, [stakingWallet])
      .withStoreValue(accounts.__test.$list, [stakingAccountA])
      .build();

    // DI permission/availability handlers register through unscoped events at
    // import time — the fork scope starts empty and `findSignatory` would call
    // everything unsignable, guard included.
    await seedAccountHandlers(env.scope);

    return env;
  }

  it('builds no call and blocks Continue on a disconnected chain', async () => {
    await buildEnv(ConnectionStatus.DISCONNECTED);

    await env.executeEvent(amountFlowModel.unbondRequested, createTarget());
    await env.executeEvent(amountFlowModel.amountChanged, '10');

    // The flow really started — the nulls below are a verdict, not idle state.
    expect(env.getState(amountFlowModel.$request)).not.toBeNull();
    expect(env.getState(amountFlowModel.$coreTx)).toBeNull();
    expect(env.getState(amountFlowModel.$canContinue)).toBe(false);
  });

  it('builds the call once the chain is connected', async () => {
    await buildEnv(ConnectionStatus.CONNECTED);

    await env.executeEvent(amountFlowModel.unbondRequested, createTarget());
    await env.executeEvent(amountFlowModel.amountChanged, '10');

    expect(env.getState(amountFlowModel.$coreTx)).not.toBeNull();
  });
});
