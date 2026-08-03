import { describe, expect, it } from 'vitest';

import { CryptoType, SigningType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';

import { collectSignerAccountIds, isSignerAccount } from './signer-accounts';

const acc = (n: number): AccountId => `1${'0'.repeat(46)}${n}`.slice(0, 48) as AccountId;

const ALICE = acc(1);
const BOB = acc(2);

function account(signingType: SigningType, accountId: AccountId = ALICE): AnyAccount {
  return {
    id: `acct-${accountId}-${signingType}`,
    type: 'universal',
    name: 'Account',
    walletId: 1,
    accountId,
    cryptoType: CryptoType.SR25519,
    signingType,
    createdAt: 0,
  };
}

describe('isSignerAccount', () => {
  it('accepts every account that carries a signing type', () => {
    expect(isSignerAccount(account(SigningType.POLKADOT_VAULT))).toBe(true);
    expect(isSignerAccount(account(SigningType.WALLET_CONNECT))).toBe(true);
    // A multisig account signs through its signatories, and the graph treats it
    // as a terminal own node — it must not be filtered out here.
    expect(isSignerAccount(account(SigningType.MULTISIG))).toBe(true);
  });

  it('rejects watch-only, whatever kind of wallet it sits in', () => {
    // Proxied accounts are stored with WATCH_ONLY inside a PROXIED wallet, so
    // the account — not the wallet type — is what carries the verdict.
    expect(isSignerAccount(account(SigningType.WATCH_ONLY))).toBe(false);
  });
});

describe('collectSignerAccountIds', () => {
  it('keeps only the accountIds that can sign', () => {
    const signers = collectSignerAccountIds([
      account(SigningType.POLKADOT_VAULT, ALICE),
      account(SigningType.WATCH_ONLY, BOB),
    ]);

    expect([...signers]).toEqual([ALICE]);
  });

  it('is empty for an empty list', () => {
    expect(collectSignerAccountIds([]).size).toBe(0);
  });
});
