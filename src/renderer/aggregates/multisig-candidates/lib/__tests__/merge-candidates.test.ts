import { describe, expect, it } from 'vitest';

import { type Contact, type Wallet, WalletType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { mergeMultisigCandidates } from '../merge-candidates';

const ALICE_ID = '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d' as AccountId;
const BOB_ID = '0x8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48' as AccountId;
const EVE_ID = '0xe659a7a1628cdd93febc04a4e0646ea20e9f5f0ce097d9a05290d4a9e054df4e' as AccountId;

const multisigWallet = {
  id: 1,
  name: 'Alice Multisig',
  type: WalletType.MULTISIG,
  accounts: [
    {
      accountId: ALICE_ID,
      accountType: 'multisig' as const,
      walletId: 1,
      signatories: [{ accountId: ALICE_ID }, { accountId: BOB_ID }],
      threshold: 2,
    },
  ],
} as unknown as Wallet;

const flexibleMultisigWallet = {
  id: 2,
  name: 'Bob Flexible Multisig',
  type: WalletType.FLEXIBLE_MULTISIG,
  accounts: [
    {
      accountId: BOB_ID,
      accountType: 'flex_multisig' as const,
      walletId: 2,
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      multisigAccountId: BOB_ID,
      signatories: [{ accountId: BOB_ID }, { accountId: EVE_ID }],
      threshold: 2,
      proxyType: 'Any',
      deposit: '0',
      entropyBlockNumber: 100,
      extrinsicIndex: 0,
    },
  ],
} as unknown as Wallet;

const regularWallet = {
  id: 3,
  name: 'Regular Single',
  type: WalletType.SINGLE_PARITY_SIGNER,
  accounts: [
    {
      accountId: EVE_ID,
      accountType: 'base' as const,
      walletId: 3,
    },
  ],
} as unknown as Wallet;

const backendContactWithSignatories: Contact = {
  id: 'contact-1',
  name: 'My Backend Multisig',
  address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as any,
  accountId: ALICE_ID,
  source: 'backend',
  entityNames: [],
  chainId: null,
  chainName: null,
  categoryName: null,
  contactTypeName: null,
  derivationPath: null,
  ownerAccountId: null,
  signatories: [
    '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
    '0x8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48',
  ],
  threshold: 2,
  tags: [],
};

const backendContactNullSignatories: Contact = {
  id: 'contact-2',
  name: 'Backend No Signatories',
  address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' as any,
  accountId: BOB_ID,
  source: 'backend',
  entityNames: [],
  chainId: null,
  chainName: null,
  categoryName: null,
  contactTypeName: null,
  derivationPath: null,
  ownerAccountId: null,
  signatories: null,
  threshold: null,
  tags: [],
};

const backendContactEmptySignatories: Contact = {
  id: 'contact-3',
  name: 'Backend Empty Signatories',
  address: '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZ5GPjGNRdnW' as any,
  accountId: EVE_ID,
  source: 'backend',
  entityNames: [],
  chainId: null,
  chainName: null,
  categoryName: null,
  contactTypeName: null,
  derivationPath: null,
  ownerAccountId: null,
  signatories: [],
  threshold: 2,
  tags: [],
};

const localContact: Contact = {
  id: 'local-1',
  name: 'Alice Local',
  address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as any,
  accountId: ALICE_ID,
  source: 'local',
};

describe('mergeMultisigCandidates', () => {
  it('returns WalletCandidate for a MULTISIG wallet with valid account', () => {
    const result = mergeMultisigCandidates([multisigWallet], []);
    expect(result).toHaveLength(1);
    const candidate = result[0]!;
    expect(candidate.source).toBe('wallet');
    if (candidate.source === 'wallet') {
      expect(candidate.walletId).toBe(1);
      expect(candidate.name).toBe('Alice Multisig');
      expect(candidate.accountId).toBe(ALICE_ID);
      expect(candidate.threshold).toBe(2);
    }
  });

  it('excludes FLEXIBLE_MULTISIG wallet', () => {
    const result = mergeMultisigCandidates([flexibleMultisigWallet], []);
    expect(result).toHaveLength(0);
  });

  it('excludes non-multisig wallet (SINGLE_PARITY_SIGNER)', () => {
    const result = mergeMultisigCandidates([regularWallet], []);
    expect(result).toHaveLength(0);
  });

  it('returns ContactCandidate for backend contact with signatories and threshold', () => {
    const result = mergeMultisigCandidates([], [backendContactWithSignatories]);
    expect(result).toHaveLength(1);
    const candidate = result[0]!;
    expect(candidate.source).toBe('contact');
    if (candidate.source === 'contact') {
      expect(candidate.contactId).toBe('contact-1');
      expect(candidate.name).toBe('My Backend Multisig');
      expect(candidate.threshold).toBe(2);
      expect(candidate.signatories).toHaveLength(2);
    }
  });

  it('excludes backend contact with signatories: null', () => {
    const result = mergeMultisigCandidates([], [backendContactNullSignatories]);
    expect(result).toHaveLength(0);
  });

  it('excludes backend contact with empty signatories', () => {
    const result = mergeMultisigCandidates([], [backendContactEmptySignatories]);
    expect(result).toHaveLength(0);
  });

  it('excludes local contact', () => {
    const result = mergeMultisigCandidates([], [localContact]);
    expect(result).toHaveLength(0);
  });

  it('maps Signatory[] from wallets to flat AccountId[]', () => {
    const result = mergeMultisigCandidates([multisigWallet], []);
    expect(result).toHaveLength(1);
    const candidate = result[0]!;
    expect(candidate.signatories).toEqual([ALICE_ID, BOB_ID]);
  });

  it('combines wallets and contacts in output', () => {
    const result = mergeMultisigCandidates(
      [multisigWallet, flexibleMultisigWallet, regularWallet],
      [backendContactWithSignatories, backendContactNullSignatories, localContact],
    );
    expect(result).toHaveLength(2);
    expect(result.filter(c => c.source === 'wallet')).toHaveLength(1);
    expect(result.filter(c => c.source === 'contact')).toHaveLength(1);
  });
});
