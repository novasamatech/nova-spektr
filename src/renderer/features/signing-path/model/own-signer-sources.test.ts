import { fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { SigningType } from '@/shared/core';
import { createAccountId, createVaultBaseAccount, polkadotAssetHubChain } from '@/shared/mocks';

/**
 * Whether an account fits a chain is decided by a DI `anyOf` registry, and a
 * unit fork boots none — so every account would read as unavailable and the
 * pass under test would produce nothing. The availability rule has its own
 * tests; here every account fits every chain.
 */
vi.mock('@/domains/network/account/service', async (importOriginal) => {
  const actual = await importOriginal<{ accountService: Record<string, unknown> }>();

  return {
    ...actual,
    accountService: { ...actual.accountService, isAccountAvailableOnChain: () => true },
  };
});

const { graphModel } = await import('./graph-model');
const { accounts } = await import('@/domains/network');
const { networkModel } = await import('@/entities/network');

const CHAIN = polkadotAssetHubChain.chainId;
const VAULT_KEY = createAccountId('own-vault-key');
const WATCHED = createAccountId('own-watched-key');

const vaultKey = createVaultBaseAccount('vault', { walletId: 1, accountId: VAULT_KEY });
const watched = {
  ...createVaultBaseAccount('watched', { walletId: 1, accountId: WATCHED }),
  signingType: SigningType.WATCH_ONLY,
};

// Mirrors the `Map<any, any>` seed helper the sibling graph-model suite uses —
// `fork` takes a heterogeneous store→value map that no single generic describes.
const seeded = () =>
  fork({
    values: new Map<any, any>([
      [networkModel.$chains, { [CHAIN]: polkadotAssetHubChain }],
      [accounts.__test.$list, [vaultKey, watched]],
    ]),
  });

/**
 * A permissionless call — a staking payout names the validator and may be
 * submitted by anybody — makes the source a genuine choice among the keys we
 * hold. Every other pass of the source builder answers a delegation question,
 * which a plain account has no part in, so these are opt-in.
 */
describe('graph-model · own signing accounts as sources', () => {
  it('offers none of them by default', () => {
    const scope = seeded();

    expect(scope.getState(graphModel.$sourcesFor(CHAIN))).toEqual([]);
  });

  it('offers the keys we hold when the caller asks for them', () => {
    const scope = seeded();
    const sources = scope.getState(graphModel.$sourcesFor(CHAIN, { includeOwnSigners: true }));

    expect(sources.map((source) => source.accountId)).toEqual([VAULT_KEY]);
  });

  it('never offers a key we cannot sign with', () => {
    const scope = seeded();
    const sources = scope.getState(graphModel.$sourcesFor(CHAIN, { includeOwnSigners: true }));

    expect(sources.map((source) => source.accountId)).not.toContain(WATCHED);
  });

  it('keys the store cache on the option, so the two lists cannot be confused', () => {
    // The cache is keyed by chain plus a segment built from the options; a
    // segment that ignored this flag would hand one caller the other's list.
    expect(graphModel.$sourcesFor(CHAIN, { includeOwnSigners: true })).not.toBe(graphModel.$sourcesFor(CHAIN));
  });
});
