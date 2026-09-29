import { describe, expect, it } from 'vitest';

import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type RecipientCheck, resolveRecipientCheckWarning, resolveRecipientWarning } from './resolveRecipientWarning';

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

describe('resolveRecipientCheckWarning', () => {
  const noRecipient: RecipientCheck = { kind: 'no-recipient' };
  const unresolved: RecipientCheck = { kind: 'unresolved' };
  const recipients = (...accountIds: AccountId[]): RecipientCheck => ({ kind: 'recipients', accountIds });

  it('returns none when feature is off, whatever the check', () => {
    expect(resolveRecipientCheckWarning('off', knownIds, unresolved)).toBe('none');
    expect(resolveRecipientCheckWarning('off', knownIds, recipients(stranger))).toBe('none');
  });

  it('returns none when the call has no recipient', () => {
    expect(resolveRecipientCheckWarning('active', knownIds, noRecipient)).toBe('none');
    expect(resolveRecipientCheckWarning('unverifiable', knownIds, noRecipient)).toBe('none');
  });

  it('treats a recipient that cannot be read as unknown, not as nothing to check', () => {
    expect(resolveRecipientCheckWarning('active', knownIds, unresolved)).toBe('unknown');
    expect(resolveRecipientCheckWarning('unverifiable', knownIds, unresolved)).toBe('unverifiable');
  });

  it('active: warns when any recipient of the list is unknown', () => {
    expect(resolveRecipientCheckWarning('active', knownIds, recipients(known))).toBe('none');
    expect(resolveRecipientCheckWarning('active', knownIds, recipients(known, stranger))).toBe('unknown');
  });

  it('returns unverifiable for any recipient list while disconnected', () => {
    expect(resolveRecipientCheckWarning('unverifiable', knownIds, recipients(known))).toBe('unverifiable');
  });
});
