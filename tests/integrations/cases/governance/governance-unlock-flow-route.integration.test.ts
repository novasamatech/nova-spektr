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

import { ConnectionStatus, TransactionType } from '@/shared/core';
import { unlockFlowModel } from '@/features/governance-unlock-flow/model/unlock-flow';
import { polkadotChain, polkadotChainId, senderAccount, vaultWallet } from '../../fixtures/index';
import { type FeatureTestEnvironment, FeatureTestBuilder } from '../../utils/index';

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
