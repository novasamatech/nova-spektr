import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { type ChainId, type VaultBaseAccount, AccountType, CryptoType, SigningType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type MessageSigningPayload } from '../../lib/types';
import { messageSignModel } from '../message-sign-model';

const POLKADOT: ChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
const KUSAMA: ChainId = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';

const signatory: VaultBaseAccount = {
  id: '1',
  type: 'universal',
  name: 'Alice',
  walletId: 1,
  accountId: '0xaaaa' as AccountId,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  accountType: AccountType.BASE,
  createdAt: 0,
};

const payload: MessageSigningPayload = {
  message: new TextEncoder().encode('hello'),
  signatory,
  chainId: POLKADOT,
};

describe('messageSignModel', () => {
  it('starts with an empty store', () => {
    const scope = fork();
    expect(scope.getState(messageSignModel.$signStore)).toEqual(null);
  });

  it('init populates $signStore with the payload', async () => {
    const scope = fork();
    await allSettled(messageSignModel.init, { scope, params: payload });
    expect(scope.getState(messageSignModel.$signStore)).toEqual(payload);
  });

  it('chainIdChanged updates chainId in $signStore without touching other fields', async () => {
    const scope = fork();
    await allSettled(messageSignModel.init, { scope, params: payload });
    await allSettled(messageSignModel.chainIdChanged, { scope, params: KUSAMA });

    const store = scope.getState(messageSignModel.$signStore);
    expect(store).toEqual({ ...payload, chainId: KUSAMA });
  });

  it('chainIdChanged is a no-op when $signStore is empty', async () => {
    const scope = fork();
    await allSettled(messageSignModel.chainIdChanged, { scope, params: KUSAMA });
    expect(scope.getState(messageSignModel.$signStore)).toEqual(null);
  });
});
