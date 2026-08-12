import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type Wallet, ConnectionStatus, CryptoType, SigningType } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AnyAccount, accounts } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { claimRewardsModel } from '@/features/staking-claim-rewards/model/claim';
import { type ClaimRequest } from '@/features/staking-claim-rewards/types';
import {
  polkadotAssetHubChain,
  polkadotAssetHubChainId,
  stakingAccountA,
  stakingWallet,
  validatorOne,
  watchOnlyWallet,
} from '../../fixtures/index';
import {
  type FeatureTestEnvironment,
  FeatureTestBuilder,
  allureMetadata,
  seedAccountHandlers,
} from '../../utils/index';

/**
 * The claim flow must not offer the sign step when no one on the resolved
 * signing route can actually sign: a watch-only payer self-routes to itself but
 * holds no key. `$noRouteSigner` names that state and `$canSign` blocks on it,
 * instead of a dead button or a reachable sign step without a key. A payout is
 * permissionless, so the payer is a wallet account by construction — there is
 * no contact case here, unlike the position flows.
 *
 * @group integration
 * @group staking
 * @group staking-claim-rewards
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

function createClaimRequest(account: AnyAccount, wallet: Wallet): ClaimRequest {
  return {
    chain: polkadotAssetHubChain,
    asset: polkadotAssetHubChain.assets[0]!,
    account,
    wallet,
    payouts: [{ era: 100, validator: validatorOne, page: 0, amount: '1000000000' }],
  };
}

describe('Staking Claim Rewards - Route Signer Guard', () => {
  let env: FeatureTestEnvironment;

  beforeEach(async () => {
    await allureMetadata({
      epic: 'Staking',
      feature: 'Claim Rewards',
      story: 'Route signer guard',
      severity: 'critical',
    });
  });

  afterEach(async () => {
    if (env) {
      await env.executeEventVoid(claimRewardsModel.flowFinished);
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

  it('should block a claim paid by a watch-only account', async () => {
    await buildEnv([watchOnlyAccount]);

    await env.executeEvent(claimRewardsModel.claimRequested, [createClaimRequest(watchOnlyAccount, watchOnlyWallet)]);

    expect(env.getState(claimRewardsModel.$noRouteSigner)).toBe(true);
    expect(env.getState(claimRewardsModel.$canSign)).toBe(false);
  });

  it('should not block a claim paid by a signable account', async () => {
    await buildEnv([stakingAccountA]);

    await env.executeEvent(claimRewardsModel.claimRequested, [createClaimRequest(stakingAccountA, stakingWallet)]);

    // The flow really started — `false` below is a verdict, not an idle default.
    expect(env.getState(claimRewardsModel.$initiator)).not.toBeNull();
    expect(env.getState(claimRewardsModel.$noRouteSigner)).toBe(false);
  });

  it('should stay silent while no flow is open', async () => {
    await buildEnv([stakingAccountA]);

    expect(env.getState(claimRewardsModel.$noRouteSigner)).toBe(false);
  });
});
