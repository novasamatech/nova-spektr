import { describe, expect, it } from 'vitest';

import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { hasSelectionChanged, toDestination, toInitialSelection } from '../payee-selection';

const ALICE = `0x${'01'.repeat(32)}` as AccountId;
const BOB = `0x${'02'.repeat(32)}` as AccountId;

const alicePolkadot = toAddress(ALICE, { prefix: 0 });
const aliceGeneric = toAddress(ALICE, { prefix: 42 });
const bobPolkadot = toAddress(BOB, { prefix: 0 });

describe('toInitialSelection', () => {
  it('pre-selects Restake for a staked payee', () => {
    expect(toInitialSelection('Staked', alicePolkadot)).toEqual({ option: 'restake', address: '' });
  });

  it('pre-selects the account with its address for an Account payee', () => {
    expect(toInitialSelection({ Account: bobPolkadot }, alicePolkadot)).toEqual({
      option: 'account',
      address: bobPolkadot,
    });
  });

  it('pre-selects the account with the stash address for Stash and Controller', () => {
    expect(toInitialSelection('Stash', alicePolkadot)).toEqual({ option: 'account', address: alicePolkadot });
    expect(toInitialSelection('Controller', alicePolkadot)).toEqual({ option: 'account', address: alicePolkadot });
  });

  it('falls back to Restake when nothing is known', () => {
    expect(toInitialSelection(null, alicePolkadot)).toEqual({ option: 'restake', address: '' });
  });
});

describe('hasSelectionChanged', () => {
  it('is unchanged when Restake is picked over a staked payee', () => {
    expect(hasSelectionChanged('Staked', { option: 'restake', address: '' })).toBe(false);
  });

  it('is changed when Restake is picked over an account payee', () => {
    expect(hasSelectionChanged({ Account: bobPolkadot }, { option: 'restake', address: '' })).toBe(true);
  });

  it('compares account destinations by key, not by encoding', () => {
    // The same key, shown with the chain prefix and typed with the generic one.
    expect(hasSelectionChanged({ Account: alicePolkadot }, { option: 'account', address: aliceGeneric })).toBe(false);
    expect(hasSelectionChanged({ Account: alicePolkadot }, { option: 'account', address: bobPolkadot })).toBe(true);
  });

  it('treats an explicit account as a change over Stash — the on-chain variant differs', () => {
    expect(hasSelectionChanged('Stash', { option: 'account', address: alicePolkadot })).toBe(true);
  });

  it('treats an empty or invalid address as changed only once it becomes a real address', () => {
    // Not a submit-able state either way; the validity gate decides, not this.
    expect(hasSelectionChanged({ Account: alicePolkadot }, { option: 'account', address: '' })).toBe(true);
    expect(hasSelectionChanged({ Account: alicePolkadot }, { option: 'account', address: 'nope' })).toBe(true);
  });

  it('is always a change when nothing is known about the current payee', () => {
    expect(hasSelectionChanged(null, { option: 'restake', address: '' })).toBe(true);
    expect(hasSelectionChanged(null, { option: 'account', address: alicePolkadot })).toBe(true);
  });
});

describe('toDestination', () => {
  it('encodes Restake as the empty address the builder reads as Staked', () => {
    expect(toDestination({ option: 'restake', address: bobPolkadot })).toBe('');
  });

  it('passes the account address through', () => {
    expect(toDestination({ option: 'account', address: bobPolkadot })).toBe(bobPolkadot);
  });
});
