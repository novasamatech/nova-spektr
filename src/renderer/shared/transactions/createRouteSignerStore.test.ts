import { createStore } from 'effector';
import { afterEach, describe, expect, it } from 'vitest';

import { CryptoType, SigningType } from '@/shared/core';
import { createAccountId, polkadotChainId } from '@/shared/mocks';
import { type AnyAccount, accountService } from '@/domains/network';

import { createRouteSignerStore } from './createRouteSignerStore';

const makeAccount = (id: string, seed: string, signingType: SigningType): AnyAccount => ({
  id,
  type: 'chain',
  accountId: createAccountId(seed),
  chainId: polkadotChainId,
  name: id,
  walletId: 1,
  signingType,
  cryptoType: CryptoType.SR25519,
  createdAt: Date.now(),
});

describe('createRouteSignerStore', () => {
  afterEach(() => {
    accountService.accountActionPermissionAnyOf.resetHandlers();
  });

  it('returns the terminal signer for a signable self-route', () => {
    // a "signable" leaf is a Polkadot Vault key; watch-only accounts cannot sign
    accountService.accountActionPermissionAnyOf.registerHandler({
      body: ({ account }) => account.signingType === SigningType.POLKADOT_VAULT,
      available: () => true,
    });

    const signableAccount = makeAccount('a', '10', SigningType.POLKADOT_VAULT);
    const $route = createStore<AnyAccount[]>([signableAccount]);
    const $signer = createRouteSignerStore($route);

    // eslint-disable-next-line effector/no-getState
    expect($signer.getState()).toEqual(signableAccount);
  });

  it('returns null for a route ending in an unsignable account', () => {
    accountService.accountActionPermissionAnyOf.registerHandler({
      body: ({ account }) => account.signingType === SigningType.POLKADOT_VAULT,
      available: () => true,
    });

    const watchOnlyAccount = makeAccount('b', '11', SigningType.WATCH_ONLY);
    const $route = createStore<AnyAccount[]>([watchOnlyAccount]);
    const $signer = createRouteSignerStore($route);

    // eslint-disable-next-line effector/no-getState
    expect($signer.getState()).toBeNull();
  });

  it('returns null for an empty route', () => {
    const $route = createStore<AnyAccount[]>([]);
    const $signer = createRouteSignerStore($route);

    // eslint-disable-next-line effector/no-getState
    expect($signer.getState()).toBeNull();
  });
});
