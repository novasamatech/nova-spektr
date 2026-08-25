import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionStatus, CryptoType, SigningType } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accounts } from '@/domains/network';
import { type StakingPosition } from '@/domains/staking';
import { walletModel } from '@/entities/wallet';
import { payeeFlowModel } from '@/features/staking-payee-flow/model/payee-flow';
import { type PayeeFlowTarget } from '@/features/staking-payee-flow/types';
import { type SigningMode } from '@/features/validator-selection';
import {
  multisigAccount,
  multisigWallet,
  polkadotAssetHubChain,
  polkadotAssetHubChainId,
  signatoryAccount,
  stakingAccountA,
  stakingWallet,
  vaultWallet,
  watchOnlyWallet,
} from '../../fixtures/index';
import {
  type FeatureTestEnvironment,
  FeatureTestBuilder,
  allureMetadata,
  seedAccountHandlers,
} from '../../utils/index';

/**
 * The payee flow (Change reward destination) must not offer the sign step when
 * no one on the resolved signing route can actually sign: a watch-only account
 * self-routes to itself but holds no key, and a contact position has no local
 * account at all. `$noRouteSigner` names that state and `$canContinue` blocks
 * on it. A multisig position is the other side of the same rule: the call's
 * origin stays the multisig while the route ends on a signatory who can sign.
 *
 * @group integration
 * @group staking
 * @group staking-payee-flow
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
    payee: 'Staked',
    payeeLoaded: true,
  };
}

function createTarget(
  account: AnyAccount | null,
  accountId: AccountId,
  signingMode: SigningMode = 'local',
): PayeeFlowTarget {
  return {
    position: createPosition(accountId),
    chain: polkadotAssetHubChain,
    asset: polkadotAssetHubChain.assets[0]!,
    account,
    wallet: account ? stakingWallet : null,
    signingMode,
  };
}

describe('Staking Payee Flow - Route Signer Guard', () => {
  let env: FeatureTestEnvironment;

  beforeEach(async () => {
    await allureMetadata({
      epic: 'Staking',
      feature: 'Payee Flow',
      story: 'Route signer guard',
      severity: 'critical',
    });
  });

  afterEach(async () => {
    if (env) {
      await env.executeEventVoid(payeeFlowModel.flowClosed);
      await env.cleanup();
    }
  });

  async function buildEnv(walletAccounts: AnyAccount[]) {
    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withChain(polkadotAssetHubChain)
      .withConnectionStatus(polkadotAssetHubChainId, ConnectionStatus.CONNECTED)
      .withStoreValue(walletModel.__test.$rawWallets, [stakingWallet, watchOnlyWallet, multisigWallet, vaultWallet])
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
      payeeFlowModel.changeRewardDestinationRequested,
      createTarget(watchOnlyAccount, watchOnlyAccount.accountId, 'watchOnly'),
    );

    expect(env.getState(payeeFlowModel.$noRouteSigner)).toBe(true);
    expect(env.getState(payeeFlowModel.$canContinue)).toBe(false);
  });

  it('should not block the flow for a plain signable account', async () => {
    await buildEnv([stakingAccountA]);

    await env.executeEvent(
      payeeFlowModel.changeRewardDestinationRequested,
      createTarget(stakingAccountA, stakingAccountA.accountId),
    );

    // The flow really started — `false` below is a verdict, not an idle default.
    expect(env.getState(payeeFlowModel.$request)).not.toBeNull();
    expect(env.getState(payeeFlowModel.$noRouteSigner)).toBe(false);
    // The call is the position's own.
    expect(env.getState(payeeFlowModel.$coreTx)?.accountId).toBe(stakingAccountA.accountId);
  });

  it('should route a multisig position through its signatory while keeping the multisig as origin', async () => {
    await buildEnv([multisigAccount, signatoryAccount]);

    await env.executeEvent(payeeFlowModel.changeRewardDestinationRequested, {
      ...createTarget(multisigAccount, multisigAccount.accountId),
      wallet: multisigWallet,
    });

    expect(env.getState(payeeFlowModel.$noRouteSigner)).toBe(false);
    expect(env.getState(payeeFlowModel.$coreTx)?.accountId).toBe(multisigAccount.accountId);
    expect(env.getState(payeeFlowModel.$signatory)?.accountId).toBe(signatoryAccount.accountId);
  });

  it('should block a contact position (no local account) once draft mode is off', async () => {
    await buildEnv([stakingAccountA]);

    // The drawer sends `draft` for a contact position, so the flow opens with
    // draft mode already on…
    await env.executeEvent(
      payeeFlowModel.changeRewardDestinationRequested,
      createTarget(null, contactAccountId, 'draft'),
    );

    expect(env.getState(payeeFlowModel.$isDraftMode)).toBe(true);
    expect(env.getState(payeeFlowModel.$canContinue)).toBe(false);

    // …and the guard takes over the moment the user toggles it off.
    await env.executeEvent(payeeFlowModel.toggleDraftMode, false);

    expect(env.getState(payeeFlowModel.$noRouteSigner)).toBe(true);
    expect(env.getState(payeeFlowModel.$canContinue)).toBe(false);
  });

  it('should stay silent while no flow is open', async () => {
    await buildEnv([stakingAccountA]);

    expect(env.getState(payeeFlowModel.$noRouteSigner)).toBe(false);
  });
});
