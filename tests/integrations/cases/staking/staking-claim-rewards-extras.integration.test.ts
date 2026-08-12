import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Balance, AccountType, ConnectionStatus, CryptoType, SigningType } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AnyAccount, accounts, transactionService } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { walletModel } from '@/entities/wallet';
import { claimRewardsModel } from '@/features/staking-claim-rewards/model/claim';
import { type ClaimRequest } from '@/features/staking-claim-rewards/types';
import {
  createBalance,
  kusamaAssetHubChainId,
  polkadotAssetHubChain,
  polkadotAssetHubChainId,
  stakingAccountA,
  stakingAccountB,
  stakingWallet,
  validatorOne,
  validatorTwo,
} from '../../fixtures/index';
import {
  type FeatureTestEnvironment,
  FeatureTestBuilder,
  allureMetadata,
  resetAccountHandlers,
  seedAccountHandlers,
} from '../../utils/index';

/**
 * A claim spanning several transactions must validate and price EVERY plan, not
 * just the first. The regression this pins: with two payers, a fully funded
 * first payer used to make the whole session signable even when the second
 * payer could not afford its own fee — the extra transactions were wrapped but
 * never validated, and the total fee was the primary fee × count. Now each
 * extra runs through the same validator with its own quoted fee, a failing
 * extra blocks `$canSign`, and an extra whose route resolves without a
 * signatory settles into an explicit error instead of leaving `$preparing`
 * stuck true forever.
 *
 * @group integration
 * @group staking
 * @group staking-claim-rewards
 */

const asset = polkadotAssetHubChain.assets[0]!;

// Distinct per-transaction quotes so the summed total cannot pass by accident:
// the primary is priced through the fee calculator (`getSplitExtrinsicFee`),
// each extra through the validator's fee rule (`getTransactionFee`).
const PRIMARY_FEE = new BN(111);
const EXTRA_FEE_B = new BN(222);

// ED in `createBalance` is 1 DOT; anything at or below it cannot pay a fee
// under the keep-alive rule, anything comfortably above it can.
const FUNDED = '1000000000000'; // 100 DOT
const UNFUNDED = '10000000000'; // exactly the ED — fails the fee withdraw

// The fee calculator only reads the fee from the (spied) service, the
// validator round-trips the wrapped call through `method.toHex()`, and the
// confirm's pending-multisig check hashes it.
const fakeExtrinsic = { method: { toHex: () => '0x0405', hash: { toHex: () => '0x0405' } } };
const fakeApi = {
  genesisHash: { toHex: () => polkadotAssetHubChainId },
  tx: { staking: { payoutStakersByPage: () => fakeExtrinsic } },
} as unknown as ApiPromise;

/**
 * A multisig that lives on ANOTHER chain while its claim is requested on this
 * one: the default path resolves to its signatory (Staking A), but the account
 * graph of the claim's chain does not contain the multisig itself, so
 * `findRoute` comes back empty — the one shape that produces an extra route
 * without a terminal signatory.
 */
const kusamaMultisig = {
  id: 'staking-extras-kusama-multisig',
  accountId: createAccountId('staking-extras-kusama-multisig'),
  walletId: stakingWallet.id,
  name: 'Kusama Multisig',
  type: 'chain',
  chainId: kusamaAssetHubChainId,
  accountType: AccountType.MULTISIG,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.MULTISIG,
  threshold: 1,
  signatories: [{ accountId: stakingAccountA.accountId, name: 'Staking A' }],
  createdAt: 0,
} as unknown as AnyAccount;

function createClaimRequest(account: AnyAccount, validator = validatorOne): ClaimRequest {
  return {
    chain: polkadotAssetHubChain,
    asset,
    account,
    wallet: stakingWallet,
    payouts: [{ era: 100, validator, page: 0, amount: '1000000000' }],
    signingMode: 'local',
  };
}

describe('Staking Claim Rewards - Extra Plans Validation', () => {
  let env: FeatureTestEnvironment;

  beforeEach(async () => {
    await allureMetadata({
      epic: 'Staking',
      feature: 'Claim Rewards',
      story: 'Extra plans validation',
      severity: 'critical',
    });

    vi.spyOn(transactionService, 'getSplitExtrinsicFee').mockResolvedValue(PRIMARY_FEE);
    vi.spyOn(transactionService, 'getTransactionFee').mockImplementation(async (_transaction, signatory) =>
      signatory === stakingAccountB.accountId ? EXTRA_FEE_B : PRIMARY_FEE,
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    resetAccountHandlers();
    if (env) {
      await env.executeEventVoid(claimRewardsModel.flowFinished);
      await env.cleanup();
    }
  });

  async function buildEnv(walletAccounts: AnyAccount[], balances: Balance[]) {
    const balanceMap = Object.fromEntries(balances.map((balance) => [balance.id, balance]));

    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withChain(polkadotAssetHubChain)
      .withConnectionStatus(polkadotAssetHubChainId, ConnectionStatus.CONNECTED)
      .withApi(polkadotAssetHubChainId, fakeApi)
      .withStoreValue(walletModel.__test.$rawWallets, [stakingWallet])
      .withStoreValue(accounts.__test.$list, walletAccounts)
      .withStoreValue(balanceModel.__test.$balanceMap, balanceMap)
      .build();

    // Route resolution reads the availability/permission registries from
    // scoped combines, the validator reads them from inside effects (which
    // resolve to the unscoped registry) — seed both, reset in afterEach.
    await seedAccountHandlers(env.scope);
    await seedAccountHandlers();

    return env;
  }

  const balanceFor = (account: AnyAccount, amount: string) =>
    createBalance(account.accountId, polkadotAssetHubChainId, asset.assetId, amount);

  it('should block signing when the second payer cannot afford its own fee', async () => {
    await buildEnv(
      [stakingAccountA, stakingAccountB],
      [balanceFor(stakingAccountA, FUNDED), balanceFor(stakingAccountB, UNFUNDED)],
    );

    await env.executeEvent(claimRewardsModel.claimRequested, [
      createClaimRequest(stakingAccountA, validatorOne),
      createClaimRequest(stakingAccountB, validatorTwo),
    ]);

    expect(env.getState(claimRewardsModel.$plans)).toHaveLength(2);
    // The primary payer alone is fine — exactly the state that used to slip
    // through to a signable session.
    expect(env.getState(claimRewardsModel.$errors)).toEqual([]);
    expect(env.getState(claimRewardsModel.$preparing)).toBe(false);
    expect(env.getState(claimRewardsModel.$extraErrors)).not.toEqual([]);
    expect(env.getState(claimRewardsModel.$canSign)).toBe(false);
  });

  it('should validate every plan and sum the per-transaction fees when all payers are funded', async () => {
    await buildEnv(
      [stakingAccountA, stakingAccountB],
      [balanceFor(stakingAccountA, FUNDED), balanceFor(stakingAccountB, FUNDED)],
    );

    await env.executeEvent(claimRewardsModel.claimRequested, [
      createClaimRequest(stakingAccountA, validatorOne),
      createClaimRequest(stakingAccountB, validatorTwo),
    ]);

    expect(env.getState(claimRewardsModel.$preparing)).toBe(false);
    expect(env.getState(claimRewardsModel.$extraErrors)).toEqual([]);
    expect(env.getState(claimRewardsModel.$canSign)).toBe(true);
    // Primary quote + the extra's own quote — not primary × 2.
    expect(env.getState(claimRewardsModel.$totalFee)?.toString()).toBe(PRIMARY_FEE.add(EXTRA_FEE_B).toString());
  });

  it('should settle with an error instead of hanging when an extra route resolves without a signer', async () => {
    await buildEnv(
      [stakingAccountA, kusamaMultisig],
      [balanceFor(stakingAccountA, FUNDED), balanceFor(kusamaMultisig, FUNDED)],
    );

    await env.executeEvent(claimRewardsModel.claimRequested, [
      createClaimRequest(stakingAccountA, validatorOne),
      createClaimRequest(kusamaMultisig, validatorTwo),
    ]);

    expect(env.getState(claimRewardsModel.$plans)).toHaveLength(2);
    // The dropped entry must not leave the confirm preparing forever…
    expect(env.getState(claimRewardsModel.$preparing)).toBe(false);
    // …and must surface as an explicit verbatim-rendered error that blocks
    // signing (the dry-run shape is the one the alert renders under its own
    // title, without the misleading "Dry run error:" prefix of bare messages).
    const extraErrors = env.getState(claimRewardsModel.$extraErrors);
    expect(extraErrors).toHaveLength(1);
    expect(extraErrors[0]).toMatchObject({ dryRunError: true, description: expect.any(String) });
    expect(env.getState(claimRewardsModel.$canSign)).toBe(false);
  });

  it('should fail closed when an extra cannot be validated at all', async () => {
    // No balance record for the second payer: the validator's fee rule asserts
    // on the missing balance and the validator swallows the throw into an
    // empty verdict — no errors, no priced fee. That must read as a blocking
    // error, not as a pass.
    await buildEnv([stakingAccountA, stakingAccountB], [balanceFor(stakingAccountA, FUNDED)]);

    await env.executeEvent(claimRewardsModel.claimRequested, [
      createClaimRequest(stakingAccountA, validatorOne),
      createClaimRequest(stakingAccountB, validatorTwo),
    ]);

    expect(env.getState(claimRewardsModel.$preparing)).toBe(false);
    const extraErrors = env.getState(claimRewardsModel.$extraErrors);
    expect(extraErrors).toHaveLength(1);
    expect(extraErrors[0]).toMatchObject({ dryRunError: true, failureReason: 'extra-validation-failed' });
    expect(env.getState(claimRewardsModel.$canSign)).toBe(false);
  });
});
