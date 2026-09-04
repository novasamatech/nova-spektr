import { describe, expect, it } from 'vitest';

import { createAccountId } from '@/shared/mocks';

import { toSubstrateAccountIds } from './substrateAccountIds';

const substrateA = createAccountId('a');
const substrateB = createAccountId('b');
/** A Moonbeam-style H160 id — 20 bytes, no `votingFor` key on a Substrate chain. */
const ethereum = '0x1234567890abcdef1234567890abcdef12345678';

describe('toSubstrateAccountIds', () => {
  it('keeps 32-byte ids in their original order', () => {
    expect(toSubstrateAccountIds([substrateB, substrateA])).toEqual([substrateB, substrateA]);
  });

  it('drops 20-byte ethereum ids', () => {
    expect(toSubstrateAccountIds([substrateA, ethereum, substrateB])).toEqual([substrateA, substrateB]);
  });

  it('drops ids that are not hex at all', () => {
    expect(toSubstrateAccountIds(['not-an-id', substrateA])).toEqual([substrateA]);
  });

  it('is empty for no ids and for ethereum-only ids', () => {
    expect(toSubstrateAccountIds([])).toEqual([]);
    expect(toSubstrateAccountIds([ethereum])).toEqual([]);
  });
});
