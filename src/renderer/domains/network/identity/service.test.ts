import { describe, expect, it } from 'vitest';

import { createAccountId, polkadotChainId } from '@/shared/mocks';

import { identityService } from './service';
import { type AccountIdentity } from './types';

const identity = (name: string, subName?: string): AccountIdentity => ({
  chainId: polkadotChainId,
  accountId: createAccountId('identity'),
  name,
  subName,
  email: '',
  image: '',
  website: '',
});

describe('identityService.getFullName', () => {
  it('returns the name when there is no sub-identity', () => {
    expect(identityService.getFullName(identity('Alice'))).toBe('Alice');
  });

  it('joins the name and the sub-identity name', () => {
    expect(identityService.getFullName(identity('Alice', 'treasury'))).toBe('Alice / treasury');
  });

  it('skips an empty name', () => {
    expect(identityService.getFullName(identity('', 'treasury'))).toBe('treasury');
  });

  it('returns an empty string when there is no visible name', () => {
    expect(identityService.getFullName(identity(''))).toBe('');
  });
});
