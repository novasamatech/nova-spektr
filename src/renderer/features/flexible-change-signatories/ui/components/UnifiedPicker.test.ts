import { describe, expect, it } from 'vitest';

import { type Chain, ChainOptions } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type MultisigCandidate } from '@/aggregates/multisig-candidates';

import { filterCandidatesByChainFamily } from './UnifiedPicker';

const substrateChain = {
  options: [],
} as unknown as Chain;

const ethereumChain = {
  options: [ChainOptions.ETHEREUM_BASED],
} as unknown as Chain;

const substrateCandidate = {
  source: 'wallet',
  walletId: 1,
  name: 'Substrate multisig',
  accountId: createAccountId('substrate-multisig'),
  address: '5Substrate' as never,
  signatories: [createAccountId('substrate-signatory')],
  threshold: 1,
} satisfies MultisigCandidate;

const ethereumCandidate = {
  source: 'wallet',
  walletId: 2,
  name: 'Ethereum multisig',
  accountId: '0x1111111111111111111111111111111111111111' as never,
  address: '0x1111111111111111111111111111111111111111' as never,
  signatories: ['0x2222222222222222222222222222222222222222' as never],
  threshold: 1,
} satisfies MultisigCandidate;

describe('filterCandidatesByChainFamily', () => {
  it('keeps only substrate multisigs for substrate chains', () => {
    expect(filterCandidatesByChainFamily([substrateCandidate, ethereumCandidate], substrateChain)).toEqual([
      substrateCandidate,
    ]);
  });

  it('keeps only EVM multisigs for EVM chains', () => {
    expect(filterCandidatesByChainFamily([substrateCandidate, ethereumCandidate], ethereumChain)).toEqual([
      ethereumCandidate,
    ]);
  });
});
