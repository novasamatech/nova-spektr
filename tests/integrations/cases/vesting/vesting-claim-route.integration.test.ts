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

import { ConnectionStatus } from '@/shared/core';
import { claimModel } from '@/features/vesting-claim/model/claim';
import { polkadotChain, polkadotChainId, senderAccount, vaultWallet } from '../../fixtures/index';
import { type FeatureTestEnvironment, FeatureTestBuilder } from '../../utils/index';

/**
 * The claim's signing route.
 *
 * A vesting claim is `vesting.vest()` — a call an account makes for itself. For
 * a **regular account** the signing path is empty by design (`pickDefaultPath`
 * bails on any initiator that is neither multisig nor proxied), so a signatory
 * derived from the path alone comes out null. That left the route empty, and an
 * empty route is fatal in a way that is completely silent from the UI: wrapping
 * throws "Signatory is required", no transaction is built, no fee is ever
 * requested, and the confirm sits forever on a fee spinner with Sign disabled.
 *
 * The route is therefore the thing worth pinning: everything downstream —
 * transaction, fee, validation, signing — is unreachable without it.
 *
 * @group integration
 * @group vesting
 */
describe('vesting claim — signing route', () => {
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

  it('routes a regular account to itself, so the claim can be built and priced', async () => {
    await allSettled(claimModel.claimStarted, {
      scope: env.scope,
      params: {
        chain: polkadotChain,
        initiator: senderAccount,
        claimable: new BN(50_000_000_000),
        stillLocked: new BN(0),
      },
    });

    const route = env.scope.getState(claimModel.$route);

    // Not empty: a regular account signs for itself. An empty route here is the
    // fee-never-arrives bug.
    expect(route).toHaveLength(1);
    expect(route.at(-1)?.accountId).toBe(senderAccount.accountId);
    expect(env.scope.getState(claimModel.$signatory)?.accountId).toBe(senderAccount.accountId);
  });
});
