import { BN } from '@polkadot/util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type Balance,
  type Wallet,
  AssetType,
  ConnectionStatus,
  CryptoType,
  SigningType,
  WalletType,
} from '@/shared/core';
import { reservableAmountBN } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';
import { type AnyAccount, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { newPositionFlowModel } from '@/features/staking-new-position-flow/model/new-position-flow';
import { Step } from '@/features/staking-new-position-flow/types';
import { polkadotAssetHubChain, polkadotAssetHubChainId, stakingAccountA, stakingWallet } from '../../fixtures/index';
import {
  type FeatureTestEnvironment,
  FeatureTestBuilder,
  allureMetadata,
  seedAccountHandlers,
} from '../../utils/index';

/**
 * Switching the active wallet while the new-position flow is up (or between
 * opens) must move the seeded "Stake from" account — and therefore the
 * `Available` figure — to the newly selected wallet. Before the fix the
 * initiator auto-seed only listened to account-list and chain changes, so the
 * form kept quoting the previous wallet's balance until the network changed.
 *
 * The switch is deliberate, so it wins over a hand-picked initiator; a
 * re-select of the already-active wallet is a no-op and must clobber nothing.
 *
 * @group integration
 * @group staking
 * @group staking-new-position-flow
 */

const secondWallet: Wallet = {
  id: 77,
  name: 'Second Wallet',
  type: WalletType.WALLET_CONNECT,
  accounts: [],
};

const secondAccount: AnyAccount = {
  id: 'staking-second',
  accountId: createAccountId('staking-second'),
  walletId: secondWallet.id,
  name: 'Staking Second',
  type: 'universal',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.WALLET_CONNECT,
  createdAt: 0,
};

function createNativeBalance(account: AnyAccount, freeDot: number): Balance {
  const assetId = polkadotAssetHubChain.assets[0]!.assetId;

  return {
    id: balanceUtils.constructBalanceId(account.accountId, polkadotAssetHubChainId, assetId),
    accountId: account.accountId,
    chainId: polkadotAssetHubChainId,
    assetId,
    assetType: AssetType.NATIVE,
    free: new BN(freeDot).mul(new BN(10_000_000_000)),
    frozen: new BN(0),
    reserved: new BN(0),
    locked: [],
    transferableMode: 'legacy',
    providers: 1,
    consumers: 0,
    sufficients: 0,
    ed: new BN(10_000_000_000),
  };
}

const balanceA = createNativeBalance(stakingAccountA, 1000);
const balanceB = createNativeBalance(secondAccount, 250);

describe('Staking New Position Flow - Active Wallet Switch', () => {
  let env: FeatureTestEnvironment;

  beforeEach(async () => {
    await allureMetadata({
      epic: 'Staking',
      feature: 'New Position Flow',
      story: 'Active wallet switch re-seeds the initiator',
      severity: 'normal',
    });

    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withChain(polkadotAssetHubChain)
      .withConnectionStatus(polkadotAssetHubChainId, ConnectionStatus.CONNECTED)
      .withStoreValue(walletModel.__test.$rawWallets, [stakingWallet, secondWallet])
      .withStoreValue(accounts.__test.$list, [stakingAccountA, secondAccount])
      .withStoreValue(walletSelect.__test.$selectedWalletId, stakingWallet.id)
      .withStoreValue(balanceModel.__test.$balanceMap, {
        [balanceA.id]: balanceA,
        [balanceB.id]: balanceB,
      })
      .build();

    // DI availability handlers register through unscoped events at import time
    // — the fork scope starts empty and `$availableAccounts` would read as [].
    await seedAccountHandlers(env.scope);
  });

  afterEach(async () => {
    if (env) {
      await env.executeEventVoid(newPositionFlowModel.flowClosed);
      await env.cleanup();
    }
  });

  it('should re-seed the initiator and Available when the active wallet changes', async () => {
    await env.executeEventVoid(newPositionFlowModel.newPositionRequested);
    await env.executeEvent(newPositionFlowModel.initiatorChanged, stakingAccountA);

    expect(env.getState(newPositionFlowModel.$reservable).eq(reservableAmountBN(balanceA))).toBe(true);

    await env.executeEvent(walletSelect.select, secondWallet.id);

    expect(env.getState(newPositionFlowModel.$initiator)).toMatchObject({ id: secondAccount.id });
    expect(env.getState(newPositionFlowModel.$reservable).eq(reservableAmountBN(balanceB))).toBe(true);
  });

  it('should re-seed between opens, not only while the form is up', async () => {
    // The stale figure also survived a close/reopen cycle: the seed listened
    // to nothing a wallet switch touches.
    await env.executeEvent(walletSelect.select, secondWallet.id);
    await env.executeEventVoid(newPositionFlowModel.newPositionRequested);

    expect(env.getState(newPositionFlowModel.$initiator)).toMatchObject({ id: secondAccount.id });
  });

  it('should leave the initiator alone once the flow is past the form step', async () => {
    // The confirm rebuilds from the live stores, so a re-seed here would move
    // the operation to an account the user never read. The active wallet can
    // change without a click reaching the covered selector: the aggregate
    // re-points itself when the wallet leaves `$wallets`, and the id syncs
    // across windows.
    await env.executeEventVoid(newPositionFlowModel.newPositionRequested);
    await env.executeEvent(newPositionFlowModel.initiatorChanged, stakingAccountA);
    await env.executeEvent(newPositionFlowModel.stepChanged, Step.CONFIRM);

    await env.executeEvent(walletSelect.select, secondWallet.id);

    expect(env.getState(newPositionFlowModel.$initiator)).toMatchObject({ id: stakingAccountA.id });
    expect(env.getState(newPositionFlowModel.$reservable).eq(reservableAmountBN(balanceA))).toBe(true);
  });

  it('should keep a hand-picked initiator on a re-select of the current wallet', async () => {
    await env.executeEvent(walletSelect.select, secondWallet.id);
    await env.executeEventVoid(newPositionFlowModel.newPositionRequested);
    // Hand-picked from the *other* wallet while `secondWallet` stays active.
    await env.executeEvent(newPositionFlowModel.initiatorChanged, stakingAccountA);

    await env.executeEvent(walletSelect.select, secondWallet.id);

    expect(env.getState(newPositionFlowModel.$initiator)).toMatchObject({ id: stakingAccountA.id });
  });
});
