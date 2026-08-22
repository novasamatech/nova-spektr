import { describe, expect, it } from 'vitest';

import { type Contact, CryptoType, SigningType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { buildDestinationCandidates } from '../destination-candidates';

const id = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;

const account = (n: number, walletId = 1): AnyAccount => ({
  id: `account-${n}`,
  type: 'universal',
  name: `Account ${n}`,
  walletId,
  accountId: id(n),
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
});

const contact = (n: number): Contact => ({
  id: `contact-${n}`,
  name: `Contact ${n}`,
  address: toAddress(id(n)),
  accountId: id(n),
  source: 'local',
});

const everything = () => true;

describe('buildDestinationCandidates', () => {
  it('puts the position account first, then the other wallet accounts, then contacts', () => {
    const candidates = buildDestinationCandidates({
      accounts: [account(1), account(2), account(3)],
      contacts: [contact(9)],
      positionAccountId: id(2),
      isAccountOnChain: everything,
      isContactOnChain: everything,
    });

    expect(candidates.map((candidate) => candidate.accountId)).toEqual([id(2), id(1), id(3), id(9)]);
    expect(candidates[0]?.account?.id).toBe('account-2');
    expect(candidates[3]).toMatchObject({ id: `contact:${id(9)}`, account: null, name: 'Contact 9' });
  });

  it('drops accounts and contacts the chain cannot hold', () => {
    const candidates = buildDestinationCandidates({
      accounts: [account(1), account(2)],
      contacts: [contact(8), contact(9)],
      positionAccountId: id(1),
      isAccountOnChain: (candidate) => candidate.accountId !== id(2),
      isContactOnChain: (accountId) => accountId !== id(8),
    });

    expect(candidates.map((candidate) => candidate.accountId)).toEqual([id(1), id(9)]);
  });

  it('lists each key once — a wallet account wins over a contact with the same key', () => {
    const candidates = buildDestinationCandidates({
      accounts: [account(1, 1), account(1, 2), account(2)],
      contacts: [contact(1)],
      positionAccountId: null,
      isAccountOnChain: everything,
      isContactOnChain: everything,
    });

    expect(candidates.map((candidate) => candidate.accountId)).toEqual([id(1), id(2)]);
    expect(candidates[0]?.account).not.toBeNull();
  });
});
