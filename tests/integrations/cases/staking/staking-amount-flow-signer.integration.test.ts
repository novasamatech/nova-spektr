import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionStatus, CryptoType, SigningType } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accounts } from '@/domains/network';
import { type StakingPosition } from '@/domains/staking';
import { walletModel } from '@/entities/wallet';
import { amountFlowModel } from '@/features/staking-amount-flow/model/amount-flow';
import { type AmountFlowTarget } from '@/features/staking-amount-flow/types';
import { type SigningMode } from '@/features/validator-selection';
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
 * The amount flow (Unbond / Add stake) must not offer the sign step when no one
 * on the resolved signing route can actually sign: a watch-only account
 * self-routes to itself but holds no key, and a contact position has no local
 * account at all. `$noRouteSigner` names that state and `$canContinue` blocks
 * on it, instead of a dead button or a reachable sign step without a key.
 *
 * @group integration
 * @group staking
 * @group staking-amount-flow
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

/** An account known only as a contact — no local account behind the position. */
const contactAccountId = createAccountId('staking-contact');

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

function createTarget(
  account: AnyAccount | null,
  accountId: AccountId,
  signingMode: SigningMode = 'local',
): AmountFlowTarget {
  return {
    position: createPosition(accountId),
    chain: polkadotAssetHubChain,
    asset: polkadotAssetHubChain.assets[0]!,
    account,
    wallet: account ? stakingWallet : null,
    signingMode,
  };
}

describe('Staking Amount Flow - Route Signer Guard', () => {
  let env: FeatureTestEnvironment;

  beforeEach(async () => {
    await allureMetadata({
      epic: 'Staking',
      feature: 'Amount Flow',
      story: 'Route signer guard',
      severity: 'critical',
    });
  });

  afterEach(async () => {
    if (env) {
      await env.executeEventVoid(amountFlowModel.flowClosed);
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

    await env.executeEvent(
      amountFlowModel.unbondRequested,
      createTarget(watchOnlyAccount, watchOnlyAccount.accountId, 'watchOnly'),
    );

    expect(env.getState(amountFlowModel.$noRouteSigner)).toBe(true);
    expect(env.getState(amountFlowModel.$canContinue)).toBe(false);
  });

  it('should not block the flow for a signable account', async () => {
    await buildEnv([stakingAccountA]);

    await env.executeEvent(amountFlowModel.unbondRequested, createTarget(stakingAccountA, stakingAccountA.accountId));

    // The flow really started — `false` above is a verdict, not an idle default.
    expect(env.getState(amountFlowModel.$request)).not.toBeNull();
    expect(env.getState(amountFlowModel.$noRouteSigner)).toBe(false);
  });

  it('should block a contact position (no local account) once draft mode is off', async () => {
    await buildEnv([stakingAccountA]);

    // The drawer sends `draft` for a contact position, so the flow opens with
    // draft mode already on…
    await env.executeEvent(amountFlowModel.unbondRequested, createTarget(null, contactAccountId, 'draft'));

    expect(env.getState(amountFlowModel.$isDraftMode)).toBe(true);
    expect(env.getState(amountFlowModel.$canContinue)).toBe(false);

    // …and the guard takes over the moment the user toggles it off.
    await env.executeEvent(amountFlowModel.toggleDraftMode, false);

    expect(env.getState(amountFlowModel.$noRouteSigner)).toBe(true);
    expect(env.getState(amountFlowModel.$canContinue)).toBe(false);
  });

  it('should stay silent while no flow is open', async () => {
    await buildEnv([stakingAccountA]);

    expect(env.getState(amountFlowModel.$noRouteSigner)).toBe(false);
  });

  describe('signing mode carry-over', () => {
    it('should start in draft mode when the request says draft', async () => {
      await buildEnv([stakingAccountA]);

      await env.executeEvent(amountFlowModel.unbondRequested, createTarget(null, contactAccountId, 'draft'));

      expect(env.getState(amountFlowModel.$isDraftMode)).toBe(true);
    });

    it('should stay in normal mode for a local request', async () => {
      await buildEnv([stakingAccountA]);

      await env.executeEvent(
        amountFlowModel.unbondRequested,
        createTarget(stakingAccountA, stakingAccountA.accountId, 'local'),
      );

      expect(env.getState(amountFlowModel.$isDraftMode)).toBe(false);
    });

    it('should drop draft mode when a local request follows a draft one', async () => {
      await buildEnv([stakingAccountA]);

      await env.executeEvent(amountFlowModel.unbondRequested, createTarget(null, contactAccountId, 'draft'));
      expect(env.getState(amountFlowModel.$isDraftMode)).toBe(true);

      // `$isDraftMode` resets on the same event the auto-enable samples — this
      // pins that the reset lands first and the request's mode wins.
      await env.executeEvent(
        amountFlowModel.unbondRequested,
        createTarget(stakingAccountA, stakingAccountA.accountId, 'local'),
      );

      expect(env.getState(amountFlowModel.$isDraftMode)).toBe(false);
    });
  });
});
