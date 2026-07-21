import { createStore } from 'effector';
import { afterEach, describe, expect, it } from 'vitest';

import { type Chain, CryptoType, SigningType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { type AnyAccount, accountService } from '@/domains/network';

import { createSelectedInitiatorStore } from './createSelectedInitiatorStore';

const makeKey = (id: string, seed: string): AnyAccount => ({
  id,
  type: 'chain',
  accountId: createAccountId(seed),
  chainId: polkadotChainId,
  name: id,
  walletId: 1,
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
  createdAt: Date.now(),
});

describe('createSelectedInitiatorStore', () => {
  afterEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
  });

  it('resolves the initiator from the selection, not from wallet order', () => {
    accountService.accountAvailabilityOnChainAnyOf.registerHandler({
      body: ({ account, chain }) => (accountService.isChainAccount(account) ? account.chainId === chain.chainId : true),
      available: () => true,
    });

    const keyA = makeKey('a', '10');
    const keyB = makeKey('b', '11');

    const $initiator = createSelectedInitiatorStore({
      accounts: createStore<AnyAccount[]>([keyA, keyB]),
      chain: createStore<Chain | null>(polkadotChain),
      selection: createStore({ walletId: 1, address: toAddress(keyB.accountId) }),
    });

    // eslint-disable-next-line effector/no-getState
    expect($initiator.getState()).toEqual(keyB);
  });

  it('returns null without a selection', () => {
    const $initiator = createSelectedInitiatorStore({
      accounts: createStore<AnyAccount[]>([makeKey('a', '10')]),
      chain: createStore<Chain | null>(polkadotChain),
      selection: createStore<{ walletId: number; address: string } | null>(null),
    });

    // eslint-disable-next-line effector/no-getState
    expect($initiator.getState()).toBeNull();
  });
});
