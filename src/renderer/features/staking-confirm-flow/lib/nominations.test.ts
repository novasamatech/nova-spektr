import { describe, expect, it } from 'vitest';

import { type Validator } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { toNominationTargets } from './nominations';

const accountId = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;

const validator = (n: number): Validator => ({ accountId: accountId(n) }) as unknown as Validator;

describe('toNominationTargets', () => {
  it('keeps the order the picker returned', () => {
    expect(toNominationTargets([validator(3), validator(1), validator(2)])).toEqual([
      accountId(3),
      accountId(1),
      accountId(2),
    ]);
  });

  it('drops a repeated validator, keeping its first place', () => {
    expect(toNominationTargets([validator(1), validator(2), validator(1)])).toEqual([accountId(1), accountId(2)]);
  });

  it('is empty for an empty set', () => {
    expect(toNominationTargets([])).toEqual([]);
  });
});
