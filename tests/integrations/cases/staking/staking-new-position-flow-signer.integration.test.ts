import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionStatus, CryptoType, SigningType } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AnyAccount, accounts } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { newPositionFlowModel } from '@/features/staking-new-position-flow/model/new-position-flow';
import {
  polkadotAssetHubChain,
  polkadotAssetHubChainId,
  stakingAccountA,
  stakingWallet,
  watchOnlyWallet,
} from '../../fixtures/index';
import {
  type FeatureTestEnvironment,
  FeatureTestBuilder,
  allureMetadata,
  seedAccountHandlers,
} from '../../utils/index';

/**
 * The new-position flow (bond + nominate from the dashboard) must not walk
 * towards the sign step when no one on the resolved signing route can actually
 * sign: a watch-only account self-routes to itself but holds no key.
 * `$noRouteSigner` names that state and `$canContinue` blocks on it, instead of
 * a dead button or a reachable sign step without a key. Unlike its siblings the
 * flow opens without an account — no initiator picked yet is not this error.
 *
 * @group integration
 * @group staking
 * @group staking-new-position-flow
 */

const watchOnlyAccount: AnyAccount = {
  id: 'staking-watch-only',
  accountId: createAccountId('staking-watch-only'),
  walletId: watchOnlyWallet.id,
  name: 'Staking Watch Only',
  type: 'universal',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.WATCH_ONLY,
  createdAt: 0,
};

describe('Staking New Position Flow - Route Signer Guard', () => {
  let env: FeatureTestEnvironment;

  beforeEach(async () => {
    await allureMetadata({
      epic: 'Staking',
      feature: 'New Position Flow',
      story: 'Route signer guard',
      severity: 'critical',
    });
  });

  afterEach(async () => {
    if (env) {
      await env.executeEventVoid(newPositionFlowModel.flowClosed);
      await env.cleanup();
    }
  });

  async function buildEnv(walletAccounts: AnyAccount[]) {
    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withChain(polkadotAssetHubChain)
      .withConnectionStatus(polkadotAssetHubChainId, ConnectionStatus.CONNECTED)
      .withStoreValue(walletModel.__test.$rawWallets, [stakingWallet, watchOnlyWallet])
      .withStoreValue(accounts.__test.$list, walletAccounts)
      .build();

    // DI permission/availability handlers register through unscoped events at
    // import time — the fork scope starts empty and `findSignatory` would call
    // everything unsignable, guard included.
    await seedAccountHandlers(env.scope);

    return env;
  }

  it('should block the flow for a watch-only account', async () => {
    await buildEnv([watchOnlyAccount]);

    await env.executeEventVoid(newPositionFlowModel.newPositionRequested);
    await env.executeEvent(newPositionFlowModel.initiatorChanged, watchOnlyAccount);

    expect(env.getState(newPositionFlowModel.$noRouteSigner)).toBe(true);
    expect(env.getState(newPositionFlowModel.$canContinue)).toBe(false);
  });

  it('should not block the flow for a signable account', async () => {
    await buildEnv([stakingAccountA]);

    await env.executeEventVoid(newPositionFlowModel.newPositionRequested);
    await env.executeEvent(newPositionFlowModel.initiatorChanged, stakingAccountA);

    // The account really got picked — `false` below is a verdict, not an idle default.
    expect(env.getState(newPositionFlowModel.$initiator)).not.toBeNull();
    expect(env.getState(newPositionFlowModel.$noRouteSigner)).toBe(false);
  });

  it('should stay silent while no account is picked', async () => {
    await buildEnv([stakingAccountA]);

    await env.executeEventVoid(newPositionFlowModel.newPositionRequested);

    // An empty "Stake from" is `$canContinue`'s business, not an error state.
    expect(env.getState(newPositionFlowModel.$initiator)).toBeNull();
    expect(env.getState(newPositionFlowModel.$noRouteSigner)).toBe(false);
  });
});
