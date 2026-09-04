import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { allSettled } from 'effector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('graphql-request', async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    GraphQLClient: vi.fn(function () {
      return {
        request: vi.fn().mockResolvedValue({ proxieds: { nodes: [] } }),
      };
    }),
  };
});

import { type HexString, ConnectionStatus, TransactionType } from '@/shared/core';
import { type AnyAccount, type Extrinsic, accounts } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { unlockFlowModel } from '@/features/governance-unlock-flow/model/unlock-flow';
import { Step } from '@/features/governance-unlock-flow/types';
import { signModel } from '@/features/operations/OperationSign';
import {
  multisigAccount,
  multisigWallet,
  polkadotChain,
  polkadotChainId,
  senderAccount,
  signatoryAccount,
  vaultWallet,
} from '../../fixtures/index';
import { type FeatureTestEnvironment, FeatureTestBuilder, seedAccountHandlers } from '../../utils/index';

/**
 * A governance unlock originates from the locked account (or a payer for an
 * unlock-only release). For a regular account the signing path is empty, so the
 * route must fall back to the initiator — otherwise nothing downstream is
 * built.
 *
 * @group integration
 * @group governance
 */
describe('governance unlock flow — signing route and transaction', () => {
  let env: FeatureTestEnvironment;

  beforeEach(async () => {
    env = await new FeatureTestBuilder()
      .withWallet(vaultWallet)
      .withAccount(senderAccount)
      .withChain(polkadotChain)
      .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
      .build();
  });

  afterEach(async () => {
    await env?.cleanup();
  });

  it('routes a regular account to itself and batches remove_vote + unlock', async () => {
    await allSettled(unlockFlowModel.unlockRequested, {
      scope: env.scope,
      params: {
        chain: polkadotChain,
        initiator: senderAccount,
        target: senderAccount.accountId,
        actions: [
          { type: 'remove_vote', trackId: '0', referendumId: '12' },
          { type: 'unlock', trackId: '0' },
        ],
        amount: new BN(1_000_000_000_000),
      },
    });

    const route = env.scope.getState(unlockFlowModel.$route);
    expect(route.at(-1)?.accountId).toBe(senderAccount.accountId);

    const coreTx = env.scope.getState(unlockFlowModel.$coreTx);
    expect(coreTx?.type).toBe(TransactionType.BATCH_ALL);
    expect(coreTx?.args.transactions.map((tx: { type: TransactionType }) => tx.type)).toEqual([
      TransactionType.REMOVE_VOTE,
      TransactionType.UNLOCK,
    ]);
    expect(coreTx?.args.transactions[1].args.target).toBe(senderAccount.accountId);
  });

  it('routes a multisig initiator through a signatory while keeping the multisig as origin', async () => {
    await env.cleanup();
    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withChain(polkadotChain)
      .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
      .withStoreValue(walletModel.__test.$rawWallets, [multisigWallet, vaultWallet])
      .withStoreValue(accounts.__test.$list, [multisigAccount, signatoryAccount] satisfies AnyAccount[])
      .build();
    // DI permission/availability handlers register through unscoped events at
    // import time — the fork scope starts empty, so seed them in-scope.
    await seedAccountHandlers(env.scope);

    await allSettled(unlockFlowModel.unlockRequested, {
      scope: env.scope,
      params: {
        chain: polkadotChain,
        initiator: multisigAccount,
        target: multisigAccount.accountId,
        actions: [{ type: 'unlock', trackId: '0' }],
        amount: new BN(5),
      },
    });

    expect(env.scope.getState(unlockFlowModel.$coreTx)?.accountId).toBe(multisigAccount.accountId);
    expect(env.scope.getState(unlockFlowModel.$signatory)?.accountId).toBe(signatoryAccount.accountId);
    expect(env.scope.getState(unlockFlowModel.$hasMultisigAccount)).toBe(true);
  });

  it('ignores a signature that arrives while the flow is parked on confirm', async () => {
    await allSettled(unlockFlowModel.unlockRequested, {
      scope: env.scope,
      params: {
        chain: polkadotChain,
        initiator: senderAccount,
        target: senderAccount.accountId,
        actions: [{ type: 'unlock', trackId: '0' }],
        amount: new BN(5),
      },
    });
    expect(env.scope.getState(unlockFlowModel.$step)).toBe(Step.CONFIRM);

    // `signModel.signed` is app-wide: a foreign payload signed elsewhere must
    // not push this flow to submit.
    await allSettled(signModel.signed, {
      scope: env.scope,
      params: [
        {
          // Never read: the flow must drop the result before looking at it.
          api: {} as unknown as ApiPromise,
          signatory: senderAccount.accountId,
          extrinsic: {} as unknown as Extrinsic,
          signature: '0x00' as HexString,
          payload: new Uint8Array(),
        },
      ],
    });

    expect(env.scope.getState(unlockFlowModel.$step)).toBe(Step.CONFIRM);
  });

  it('clears the request and the step when the flow is closed', async () => {
    await allSettled(unlockFlowModel.unlockRequested, {
      scope: env.scope,
      params: {
        chain: polkadotChain,
        initiator: senderAccount,
        target: senderAccount.accountId,
        actions: [{ type: 'unlock', trackId: '0' }],
        amount: new BN(5),
      },
    });

    await allSettled(unlockFlowModel.flowFinished, { scope: env.scope });

    expect(env.scope.getState(unlockFlowModel.$step)).toBe(Step.NONE);
    expect(env.scope.getState(unlockFlowModel.$request)).toBeNull();
    expect(env.scope.getState(unlockFlowModel.$coreTx)).toBeNull();
  });

  it('drops a permissionless request that carries an origin-bound call', async () => {
    // A payer may release someone else's expired lock, but `remove_vote` is
    // signed by the voter — such a request can never be sent, so it never opens.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await allSettled(unlockFlowModel.unlockRequested, {
      scope: env.scope,
      params: {
        chain: polkadotChain,
        initiator: senderAccount,
        target: signatoryAccount.accountId,
        actions: [
          { type: 'remove_vote', trackId: '0', referendumId: '12' },
          { type: 'unlock', trackId: '0' },
        ],
        amount: new BN(5),
      },
    });

    expect(env.scope.getState(unlockFlowModel.$step)).toBe(Step.NONE);
    expect(env.scope.getState(unlockFlowModel.$request)).toBeNull();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('builds a single unlock call when one action is requested', async () => {
    await allSettled(unlockFlowModel.unlockRequested, {
      scope: env.scope,
      params: {
        chain: polkadotChain,
        initiator: senderAccount,
        target: senderAccount.accountId,
        actions: [{ type: 'unlock', trackId: '1' }],
        amount: new BN(5),
      },
    });

    expect(env.scope.getState(unlockFlowModel.$coreTx)?.type).toBe(TransactionType.UNLOCK);
  });
});
