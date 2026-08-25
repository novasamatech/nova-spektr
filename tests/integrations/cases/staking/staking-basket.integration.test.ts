import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { allSettled } from 'effector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Validator, type Wallet, ConnectionStatus, TransactionType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accounts, transactionService } from '@/domains/network';
import { type StakingPosition } from '@/domains/staking';
import { walletModel } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { stakingPositions } from '@/aggregates/staking-positions';
import { amountFlowModel } from '@/features/staking-amount-flow/model/amount-flow';
import { type AmountFlowTarget, Step as AmountStep } from '@/features/staking-amount-flow/types';
import { claimRewardsModel } from '@/features/staking-claim-rewards/model/claim';
import { type ClaimRequest, Step as ClaimStep } from '@/features/staking-claim-rewards/types';
import { confirmFlowModel } from '@/features/staking-confirm-flow/model/confirm-flow';
import {
  type ChangeValidatorsTarget,
  type RedeemTarget,
  Step as ConfirmStep,
} from '@/features/staking-confirm-flow/types';
import { type SigningMode } from '@/features/validator-selection';
import {
  polkadotAssetHubChain,
  polkadotAssetHubChainId,
  stakingAccountA,
  stakingAccountB,
  stakingWallet,
  validatorOne,
  validatorTwo,
  vaultWallet,
} from '../../fixtures/index';
import {
  type FeatureTestEnvironment,
  FeatureTestBuilder,
  allureMetadata,
  createStakingApi,
  createStakingScenario,
  nextStakingEra,
  resetAccountHandlers,
  seedAccountHandlers,
} from '../../utils/index';

/**
 * The dashboard staking flows carry the same "Add to basket" affordance every
 * old staking flow has: `txSaved` stores the built core call(s) in the basket
 * for this wallet to sign later and moves the flow to its BASKET step. The
 * basket signs the stored call directly by its initiator (no wrapping in the
 * basket context), so the gate (`$canUseBasket`) demands a Polkadot Vault /
 * single-shard wallet behind the initiator, no draft mode, and a storable core
 * transaction. A claim spanning several plans is stored whole — one basket
 * entry per plan — and only when every payer's wallet passes the same gate.
 *
 * @group integration
 * @group staking
 * @group staking-basket
 */

const asset = polkadotAssetHubChain.assets[0]!;

// The fee calculator only reads the fee from the (spied) service; the extras
// pipeline round-trips the wrapped call through `method.toHex()`.
const fakeExtrinsic = { method: { toHex: () => '0x0405', hash: { toHex: () => '0x0405' } } };
const fakeApi = {
  genesisHash: { toHex: () => polkadotAssetHubChainId },
  tx: { staking: { payoutStakersByPage: () => fakeExtrinsic } },
} as unknown as ApiPromise;

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

const pickedValidator: Validator = {
  accountId: validatorOne,
  chainId: polkadotAssetHubChainId,
  ownStake: '0',
  totalStake: '0',
  commission: 0,
  blocked: false,
  slashed: false,
  apy: 0,
  avgApy: 0,
  nominators: [],
};

function createUnbondTarget(
  account: AnyAccount,
  wallet: Wallet | null,
  signingMode: SigningMode = 'local',
): AmountFlowTarget {
  return {
    position: createPosition(account.accountId),
    chain: polkadotAssetHubChain,
    asset,
    account,
    wallet,
    signingMode,
  };
}

function createChangeValidatorsTarget(account: AnyAccount, wallet: Wallet | null): ChangeValidatorsTarget {
  return {
    position: createPosition(account.accountId),
    chain: polkadotAssetHubChain,
    asset,
    account,
    wallet,
    validators: [pickedValidator],
    signingMode: 'local',
  };
}

function createRedeemTarget(account: AnyAccount, wallet: Wallet): RedeemTarget {
  return {
    position: createPosition(account.accountId),
    chain: polkadotAssetHubChain,
    asset,
    account,
    wallet,
    // The snapshot the dashboard had in hand — the gate reads the LIVE figure.
    amount: '1000000000',
    signingMode: 'local',
  };
}

function createClaimRequest(
  account: AnyAccount,
  wallet: Wallet,
  validator = validatorOne,
  signingMode: SigningMode = 'local',
): ClaimRequest {
  return {
    chain: polkadotAssetHubChain,
    asset,
    account,
    wallet,
    payouts: [{ era: 100, validator, page: 0, amount: '1000000000' }],
    signingMode,
  };
}

describe('Staking Dashboard Flows - Add to Basket', () => {
  let env: FeatureTestEnvironment;

  beforeEach(async () => {
    await allureMetadata({
      epic: 'Staking',
      feature: 'Dashboard flows',
      story: 'Add to basket',
      severity: 'critical',
    });

    vi.spyOn(transactionService, 'getSplitExtrinsicFee').mockResolvedValue(new BN(100));
    vi.spyOn(transactionService, 'getTransactionFee').mockResolvedValue(new BN(100));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    resetAccountHandlers();
    if (env) {
      await env.executeEventVoid(amountFlowModel.flowClosed);
      await env.executeEventVoid(confirmFlowModel.flowClosed);
      await env.executeEventVoid(claimRewardsModel.flowFinished);
      // The staking resource pools are module-level and ref-counted — a key
      // left started outlives the scope and poisons the next test.
      await env.executeEventVoid(stakingPositions.reset);

      // The basket writes through the app's own storage, which outlives the
      // fork scope — drop what this test stored so the next one starts clean.
      const stored = env.getState(basketOperations.$list);
      if (stored.length > 0) {
        await allSettled(basketOperations.removeTransactions, { scope: env.scope, params: stored });
      }

      await env.cleanup();
    }
  });

  async function buildEnv(walletAccounts: AnyAccount[], { withApi = false } = {}) {
    const builder = new FeatureTestBuilder({ autoPopulate: false })
      .withChain(polkadotAssetHubChain)
      .withConnectionStatus(polkadotAssetHubChainId, ConnectionStatus.CONNECTED)
      .withStoreValue(walletModel.__test.$rawWallets, [vaultWallet, stakingWallet])
      .withStoreValue(accounts.__test.$list, walletAccounts);

    if (withApi) builder.withApi(polkadotAssetHubChainId, fakeApi);

    env = await builder.build();

    // Route resolution reads the availability/permission registries from
    // scoped combines, the extras pipeline from inside effects (which resolve
    // to the unscoped registry) — seed both, reset in afterEach.
    await seedAccountHandlers(env.scope);
    await seedAccountHandlers();

    return env;
  }

  describe('amount flow (unbond / add stake)', () => {
    it('should store the built call and move to the BASKET step for a vault wallet', async () => {
      await buildEnv([stakingAccountA]);

      await env.executeEvent(amountFlowModel.unbondRequested, createUnbondTarget(stakingAccountA, vaultWallet));
      await env.executeEvent(amountFlowModel.amountChanged, '1');

      expect(env.getState(amountFlowModel.$canUseBasket)).toBe(true);

      await env.executeEventVoid(amountFlowModel.txSaved);

      expect(env.getState(amountFlowModel.$step)).toBe(AmountStep.BASKET);

      const stored = env.getState(basketOperations.$list);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        initiatorAccountId: stakingAccountA.accountId,
        coreTx: { type: TransactionType.UNSTAKE, chainId: polkadotAssetHubChainId },
      });
    });

    it('should refuse in draft mode', async () => {
      await buildEnv([stakingAccountA]);

      await env.executeEvent(
        amountFlowModel.unbondRequested,
        createUnbondTarget(stakingAccountA, vaultWallet, 'draft'),
      );
      await env.executeEvent(amountFlowModel.amountChanged, '1');

      expect(env.getState(amountFlowModel.$isDraftMode)).toBe(true);
      expect(env.getState(amountFlowModel.$canUseBasket)).toBe(false);

      await env.executeEventVoid(amountFlowModel.txSaved);

      expect(env.getState(amountFlowModel.$step)).not.toBe(AmountStep.BASKET);
      expect(env.getState(basketOperations.$list)).toHaveLength(0);
    });

    it('should refuse a wallet the basket cannot sign with', async () => {
      await buildEnv([stakingAccountA]);

      // WalletConnect signs interactively — the basket cannot sign for it later.
      await env.executeEvent(amountFlowModel.unbondRequested, createUnbondTarget(stakingAccountA, stakingWallet));
      await env.executeEvent(amountFlowModel.amountChanged, '1');

      expect(env.getState(amountFlowModel.$canUseBasket)).toBe(false);

      await env.executeEventVoid(amountFlowModel.txSaved);

      expect(env.getState(amountFlowModel.$step)).not.toBe(AmountStep.BASKET);
      expect(env.getState(basketOperations.$list)).toHaveLength(0);
    });
  });

  describe('confirm flow (change validators / redeem)', () => {
    it('should store the nominate call and move to the BASKET step for a vault wallet', async () => {
      await buildEnv([stakingAccountA]);

      await env.executeEvent(
        confirmFlowModel.changeValidatorsRequested,
        createChangeValidatorsTarget(stakingAccountA, vaultWallet),
      );

      expect(env.getState(confirmFlowModel.$canUseBasket)).toBe(true);

      await env.executeEventVoid(confirmFlowModel.txSaved);

      expect(env.getState(confirmFlowModel.$step)).toBe(ConfirmStep.BASKET);

      const stored = env.getState(basketOperations.$list);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        initiatorAccountId: stakingAccountA.accountId,
        coreTx: { type: TransactionType.NOMINATE, chainId: polkadotAssetHubChainId },
      });
    });

    it('should refuse a wallet the basket cannot sign with', async () => {
      await buildEnv([stakingAccountA]);

      await env.executeEvent(
        confirmFlowModel.changeValidatorsRequested,
        createChangeValidatorsTarget(stakingAccountA, stakingWallet),
      );

      expect(env.getState(confirmFlowModel.$canUseBasket)).toBe(false);

      await env.executeEventVoid(confirmFlowModel.txSaved);

      expect(env.getState(confirmFlowModel.$step)).not.toBe(ConfirmStep.BASKET);
      expect(env.getState(basketOperations.$list)).toHaveLength(0);
    });

    it('should refuse a redeem whose live ledger has nothing left to withdraw', async () => {
      // Same live-chain seeding as the live-redeem gate suite: the only chunk
      // is still unbonding, so the LIVE redeemable is zero even though the
      // snapshot the confirm leads with says otherwise. A stored no-op would
      // still cost its signer a fee later — the basket refuses like Sign does.
      const era = nextStakingEra();
      const handle = createStakingApi({
        chainId: polkadotAssetHubChainId,
        activeEra: { index: era, startMs: 1_700_000_000_000 },
        ledgers: {
          [stakingAccountA.accountId]: {
            total: '1001000000000',
            active: '1000000000000',
            unlocking: [{ value: '1000000000', era: era + 5 }],
          },
        },
        nominations: { [stakingAccountA.accountId]: null },
      });

      const scenario = await createStakingScenario({
        chains: [polkadotAssetHubChain],
        accounts: [stakingAccountA],
        apis: { [polkadotAssetHubChainId]: handle.api },
      });
      env = scenario.env;
      await scenario.settle();

      await env.executeEvent(confirmFlowModel.redeemRequested, createRedeemTarget(stakingAccountA, vaultWallet));

      expect(env.getState(confirmFlowModel.$hasSomethingToDo)).toBe(false);
      // The vault wallet passes the wallet term — the live figure is what refuses.
      expect(env.getState(confirmFlowModel.$canUseBasket)).toBe(false);

      await env.executeEventVoid(confirmFlowModel.txSaved);

      expect(env.getState(confirmFlowModel.$step)).toBe(ConfirmStep.CONFIRM);
      expect(env.getState(basketOperations.$list)).toHaveLength(0);
    });
  });

  describe('claim rewards', () => {
    it('should store a single-plan claim as one entry', async () => {
      await buildEnv([stakingAccountA], { withApi: true });

      await env.executeEvent(claimRewardsModel.claimRequested, [createClaimRequest(stakingAccountA, vaultWallet)]);

      expect(env.getState(claimRewardsModel.$canUseBasket)).toBe(true);

      await env.executeEventVoid(claimRewardsModel.txSaved);

      expect(env.getState(claimRewardsModel.$step)).toBe(ClaimStep.BASKET);

      const stored = env.getState(basketOperations.$list);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        initiatorAccountId: stakingAccountA.accountId,
        coreTx: { type: TransactionType.PAYOUT_STAKERS_BY_PAGE, chainId: polkadotAssetHubChainId },
      });
    });

    it('should store a multi-plan claim whole — one entry per plan', async () => {
      await buildEnv([stakingAccountA, stakingAccountB], { withApi: true });

      await env.executeEvent(claimRewardsModel.claimRequested, [
        createClaimRequest(stakingAccountA, vaultWallet, validatorOne),
        createClaimRequest(stakingAccountB, vaultWallet, validatorTwo),
      ]);

      expect(env.getState(claimRewardsModel.$plans)).toHaveLength(2);
      expect(env.getState(claimRewardsModel.$canUseBasket)).toBe(true);

      await env.executeEventVoid(claimRewardsModel.txSaved);

      expect(env.getState(claimRewardsModel.$step)).toBe(ClaimStep.BASKET);

      const stored = env.getState(basketOperations.$list);
      expect(stored).toHaveLength(2);
      expect(stored.map((tx) => tx.initiatorAccountId).sort()).toEqual(
        [stakingAccountA.accountId, stakingAccountB.accountId].sort(),
      );
    });

    it('should refuse when any payer wallet cannot be signed for by the basket', async () => {
      await buildEnv([stakingAccountA, stakingAccountB], { withApi: true });

      await env.executeEvent(claimRewardsModel.claimRequested, [
        createClaimRequest(stakingAccountA, vaultWallet, validatorOne),
        // A WalletConnect payer: signable now, but not by the basket later.
        createClaimRequest(stakingAccountB, stakingWallet, validatorTwo),
      ]);

      expect(env.getState(claimRewardsModel.$canUseBasket)).toBe(false);

      await env.executeEventVoid(claimRewardsModel.txSaved);

      expect(env.getState(claimRewardsModel.$step)).not.toBe(ClaimStep.BASKET);
      expect(env.getState(basketOperations.$list)).toHaveLength(0);
    });

    it('should refuse a draft-mode session', async () => {
      await buildEnv([stakingAccountA], { withApi: true });

      await env.executeEvent(claimRewardsModel.claimRequested, [
        createClaimRequest(stakingAccountA, vaultWallet, validatorOne, 'draft'),
      ]);

      expect(env.getState(claimRewardsModel.$isDraftMode)).toBe(true);
      expect(env.getState(claimRewardsModel.$canUseBasket)).toBe(false);

      await env.executeEventVoid(claimRewardsModel.txSaved);

      expect(env.getState(claimRewardsModel.$step)).not.toBe(ClaimStep.BASKET);
      expect(env.getState(basketOperations.$list)).toHaveLength(0);
    });
  });
});
