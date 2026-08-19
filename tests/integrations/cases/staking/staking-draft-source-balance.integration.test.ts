import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionStatus } from '@/shared/core';
import { fromPrecision, reservableAmountBN } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount, accounts } from '@/domains/network';
import { type StakingPosition } from '@/domains/staking';
import { balanceModel } from '@/entities/balance';
import { walletModel } from '@/entities/wallet';
import { amountFlowModel } from '@/features/staking-amount-flow/model/amount-flow';
import { type AmountFlowTarget } from '@/features/staking-amount-flow/types';
import { newPositionFlowModel } from '@/features/staking-new-position-flow/model/new-position-flow';
import {
  createBalance,
  polkadotAssetHubChain,
  polkadotAssetHubChainId,
  stakingAccountA,
  stakingWallet,
} from '../../fixtures/index';
import {
  type FeatureTestEnvironment,
  FeatureTestBuilder,
  allureMetadata,
  seedAccountHandlers,
} from '../../utils/index';

/**
 * In draft mode the "Available"/Max figures must come from the balance of the
 * draft path's source (the eventual signer), never from the connected wallet's
 * initiator — a contact position has no initiator at all, and showing zero (or
 * a foreign balance) caps the amount against the wrong account. Outside draft
 * mode the initiator's balance keeps feeding the figures unchanged.
 *
 * @group integration
 * @group staking
 * @group staking-amount-flow
 * @group staking-new-position-flow
 */

const stakingAsset = polkadotAssetHubChain.assets[0]!;

/** An account known only from the address book — no local account behind it. */
const contactAccountId = createAccountId('staking-contact');

/** The draft path's source: whoever will eventually sign and pay. */
const draftSourceAccountId = createAccountId('staking-draft-source');

// `createBalance` fixes ed at 1 DOT and frozen at zero, so reservable = free − ed.
const initiatorBalance = createBalance(
  stakingAccountA.accountId,
  polkadotAssetHubChainId,
  stakingAsset.assetId,
  '10000000000000', // 1000 DOT
);
const draftSourceBalance = createBalance(
  draftSourceAccountId,
  polkadotAssetHubChainId,
  stakingAsset.assetId,
  '5000000000000', // 500 DOT
);

const initiatorReservable = reservableAmountBN(initiatorBalance);
const draftSourceReservable = reservableAmountBN(draftSourceBalance);

const signerNode = (accountId: AccountId): PathNode => ({ kind: 'signer', accountId });

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
  };
}

function createContactTarget(): AmountFlowTarget {
  return {
    position: createPosition(contactAccountId),
    chain: polkadotAssetHubChain,
    asset: stakingAsset,
    account: null,
    wallet: null,
    signingMode: 'draft',
  };
}

function createLocalTarget(account: AnyAccount): AmountFlowTarget {
  return {
    position: createPosition(account.accountId),
    chain: polkadotAssetHubChain,
    asset: stakingAsset,
    account,
    wallet: stakingWallet,
    signingMode: 'local',
  };
}

async function buildEnv(): Promise<FeatureTestEnvironment> {
  const env = await new FeatureTestBuilder({ autoPopulate: false })
    .withChain(polkadotAssetHubChain)
    .withConnectionStatus(polkadotAssetHubChainId, ConnectionStatus.CONNECTED)
    .withStoreValue(walletModel.__test.$rawWallets, [stakingWallet])
    .withStoreValue(accounts.__test.$list, [stakingAccountA])
    .withStoreValue(balanceModel.__test.$balanceMap, {
      [initiatorBalance.id]: initiatorBalance,
      [draftSourceBalance.id]: draftSourceBalance,
    })
    .build();

  // DI permission/availability handlers register through unscoped events at
  // import time — the fork scope starts empty without seeding.
  await seedAccountHandlers(env.scope);

  return env;
}

describe('Staking Amount Flow - Draft Source Balance', () => {
  let env: FeatureTestEnvironment;

  beforeEach(async () => {
    await allureMetadata({
      epic: 'Staking',
      feature: 'Amount Flow',
      story: 'Draft source balance',
      severity: 'critical',
    });
  });

  afterEach(async () => {
    if (env) {
      await env.executeEventVoid(amountFlowModel.flowClosed);
      await env.cleanup();
    }
  });

  it('should read the draft source balance once the path is committed', async () => {
    env = await buildEnv();

    // A contact position auto-opens in draft mode…
    await env.executeEvent(amountFlowModel.addStakeRequested, createContactTarget());
    expect(env.getState(amountFlowModel.$isDraftMode)).toBe(true);

    // …with no path yet there is nothing to read — zero, not the initiator's.
    expect(env.getState(amountFlowModel.$reservable).isZero()).toBe(true);

    await env.executeEvent(amountFlowModel.draftPathCommitted, [signerNode(draftSourceAccountId)]);

    expect(env.getState(amountFlowModel.$reservable).eq(draftSourceReservable)).toBe(true);
    expect(env.getState(amountFlowModel.$available).eq(draftSourceReservable)).toBe(true);
  });

  it('should fill Max from the draft source balance', async () => {
    env = await buildEnv();

    await env.executeEvent(amountFlowModel.addStakeRequested, createContactTarget());
    await env.executeEvent(amountFlowModel.draftPathCommitted, [signerNode(draftSourceAccountId)]);
    await env.executeEventVoid(amountFlowModel.maxAmountRequested);

    expect(env.getState(amountFlowModel.$amount)).toBe(fromPrecision(draftSourceReservable, stakingAsset.precision));
  });

  it('should keep reading the initiator balance outside draft mode', async () => {
    env = await buildEnv();

    await env.executeEvent(amountFlowModel.addStakeRequested, createLocalTarget(stakingAccountA));

    expect(env.getState(amountFlowModel.$isDraftMode)).toBe(false);
    expect(env.getState(amountFlowModel.$reservable).eq(initiatorReservable)).toBe(true);
  });
});

describe('Staking New Position Flow - Draft Source Balance', () => {
  let env: FeatureTestEnvironment;

  beforeEach(async () => {
    await allureMetadata({
      epic: 'Staking',
      feature: 'New Position Flow',
      story: 'Draft source balance',
      severity: 'critical',
    });
  });

  afterEach(async () => {
    if (env) {
      await env.executeEventVoid(newPositionFlowModel.flowClosed);
      await env.cleanup();
    }
  });

  it('should read the draft source balance once the path is committed', async () => {
    env = await buildEnv();

    await env.executeEventVoid(newPositionFlowModel.newPositionRequested);
    await env.executeEvent(newPositionFlowModel.initiatorChanged, stakingAccountA);

    // Before draft mode: the initiator's balance.
    expect(env.getState(newPositionFlowModel.$reservable).eq(initiatorReservable)).toBe(true);

    await env.executeEvent(newPositionFlowModel.toggleDraftMode, true);
    await env.executeEvent(newPositionFlowModel.draftPathCommitted, [signerNode(draftSourceAccountId)]);

    expect(env.getState(newPositionFlowModel.$reservable).eq(draftSourceReservable)).toBe(true);
    expect(env.getState(newPositionFlowModel.$available).eq(draftSourceReservable)).toBe(true);
  });

  it('should fill Max from the draft source balance', async () => {
    env = await buildEnv();

    await env.executeEventVoid(newPositionFlowModel.newPositionRequested);
    await env.executeEvent(newPositionFlowModel.initiatorChanged, stakingAccountA);
    await env.executeEvent(newPositionFlowModel.toggleDraftMode, true);
    await env.executeEvent(newPositionFlowModel.draftPathCommitted, [signerNode(draftSourceAccountId)]);
    await env.executeEventVoid(newPositionFlowModel.maxAmountRequested);

    expect(env.getState(newPositionFlowModel.$amount)).toBe(
      fromPrecision(draftSourceReservable, stakingAsset.precision),
    );
  });

  it('should fall back to the initiator balance when draft mode is toggled off', async () => {
    env = await buildEnv();

    await env.executeEventVoid(newPositionFlowModel.newPositionRequested);
    await env.executeEvent(newPositionFlowModel.initiatorChanged, stakingAccountA);
    await env.executeEvent(newPositionFlowModel.toggleDraftMode, true);
    await env.executeEvent(newPositionFlowModel.draftPathCommitted, [signerNode(draftSourceAccountId)]);
    await env.executeEvent(newPositionFlowModel.toggleDraftMode, false);

    expect(env.getState(newPositionFlowModel.$reservable).eq(initiatorReservable)).toBe(true);
  });
});
