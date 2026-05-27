import { describe, expect, it } from 'vitest';

import { type DescriptionAreaInput, resolveDescriptionAreaState } from './resolveDescriptionAreaState';

const base: DescriptionAreaInput = {
  isMultisig: true,
  isDraftActive: false,
  isHealthy: true,
  isInAddressBook: true,
  hasEverConnected: true,
};

describe('resolveDescriptionAreaState', () => {
  it('shows the field for a healthy multisig that is in the address book', () => {
    expect(resolveDescriptionAreaState(base)).toBe('field');
  });

  it('hides for a healthy multisig that is NOT in the address book', () => {
    expect(resolveDescriptionAreaState({ ...base, isInAddressBook: false })).toBe('hidden');
  });

  it('shows reconnect for a disconnected multisig that has connected before', () => {
    expect(resolveDescriptionAreaState({ ...base, isHealthy: false, isInAddressBook: false })).toBe('reconnect');
  });

  it('hides reconnect when the user has never connected', () => {
    expect(resolveDescriptionAreaState({ ...base, isHealthy: false, hasEverConnected: false })).toBe('hidden');
  });

  it('ignores hasEverConnected while healthy (the field branch does not depend on it)', () => {
    expect(resolveDescriptionAreaState({ ...base, hasEverConnected: false })).toBe('field');
  });

  it('hides entirely for non-multisig wallets regardless of connection', () => {
    expect(resolveDescriptionAreaState({ ...base, isMultisig: false })).toBe('hidden');
    expect(resolveDescriptionAreaState({ ...base, isMultisig: false, isHealthy: false })).toBe('hidden');
  });

  it('hides during draft submission even when otherwise eligible', () => {
    expect(resolveDescriptionAreaState({ ...base, isDraftActive: true })).toBe('hidden');
    expect(resolveDescriptionAreaState({ ...base, isDraftActive: true, isHealthy: false })).toBe('hidden');
  });
});
