import { describe, expect, it } from 'vitest';

import { CryptoType, SigningType } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AnyAccount } from '@/domains/network';
import { pickSeedAccount } from '../seed-account';

const account = (id: string, walletId: number): AnyAccount => ({
  id,
  accountId: createAccountId(id),
  walletId,
  name: id,
  type: 'universal',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
});

const first = account('first', 1);
const second = account('second', 2);

describe('features/staking-new-position-flow/lib/pickSeedAccount', () => {
  it('should prefer an account of the active wallet', () => {
    expect(pickSeedAccount([first, second], 2)).toBe(second);
  });

  it('should fall back to the first candidate when the active wallet has none here', () => {
    // A chain that cannot hold the active wallet's key scheme — the field still
    // needs an account, because the signing path is computed from one.
    expect(pickSeedAccount([first], 2)).toBe(first);
  });

  it('should take the first candidate when no wallet is selected', () => {
    // `null` expresses no preference, not "leave the field empty".
    expect(pickSeedAccount([first, second], null)).toBe(first);
  });

  it('should answer null when there is nothing to pick', () => {
    expect(pickSeedAccount([], 1)).toBeNull();
    expect(pickSeedAccount([], null)).toBeNull();
  });
});
