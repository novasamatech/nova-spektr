import { describe, expect, it } from 'vitest';

import { type AccountId } from '@/shared/polkadotjs-schemas';

import { resolveRecipientWarning } from './resolveRecipientWarning';

const known = '0x01' as AccountId;
const stranger = '0x02' as AccountId;
const knownIds = new Set<AccountId>([known]);

describe('resolveRecipientWarning', () => {
  it('returns none when feature is off, regardless of recipient', () => {
    expect(resolveRecipientWarning('off', knownIds, stranger)).toBe('none');
    expect(resolveRecipientWarning('off', knownIds, known)).toBe('none');
    expect(resolveRecipientWarning('off', knownIds, null)).toBe('none');
  });

  it('returns none when there is no recipient', () => {
    expect(resolveRecipientWarning('active', knownIds, null)).toBe('none');
    expect(resolveRecipientWarning('unverifiable', knownIds, null)).toBe('none');
  });

  it('returns unverifiable for every recipient while disconnected', () => {
    expect(resolveRecipientWarning('unverifiable', knownIds, known)).toBe('unverifiable');
    expect(resolveRecipientWarning('unverifiable', knownIds, stranger)).toBe('unverifiable');
  });

  it('active: warns only for unknown recipients', () => {
    expect(resolveRecipientWarning('active', knownIds, known)).toBe('none');
    expect(resolveRecipientWarning('active', knownIds, stranger)).toBe('unknown');
  });
});
