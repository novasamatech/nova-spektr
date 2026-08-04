import { describe, expect, it } from 'vitest';

import { type Wallet, WalletType } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';

import { getDefaultSelection } from './model';

const wallet = (type: WalletType): Wallet => ({ id: 1, name: 'Wallet', type, accounts: [] });

const first = createAccountId('first');
const second = createAccountId('second');

/**
 * The rule behind "which accounts do the staking actions operate on when the
 * user has ticked nothing".
 *
 * The regression this pins: the selection used to be computed by a `sample`
 * clocked on wallet and chain changes only. Both fire before the wallet's
 * accounts have loaded from storage, so the selection was computed against an
 * empty list and nothing recomputed it once the accounts arrived. A
 * single-account wallet was then stuck — its row carries no checkbox, because
 * there is nothing to choose between — and every staking action stayed disabled
 * behind "Select accounts". `$selectedNominators` is now derived, so it
 * recomputes with the account list; this function is the decision it makes.
 */
describe('getDefaultSelection', () => {
  it('selects the only account whatever the wallet type', () => {
    // Nothing to choose between, so leaving it unselected only disables the page.
    for (const type of [WalletType.POLKADOT_VAULT, WalletType.SINGLE_PARITY_SIGNER, WalletType.WALLET_CONNECT]) {
      expect(getDefaultSelection(wallet(type), [first])).toEqual([first]);
    }
  });

  it('leaves a multishard vault unselected so the user picks the shards', () => {
    expect(getDefaultSelection(wallet(WalletType.POLKADOT_VAULT), [first, second])).toEqual([]);
  });

  it.each([
    WalletType.MULTISIG,
    WalletType.FLEXIBLE_MULTISIG,
    WalletType.NOVA_WALLET,
    WalletType.WALLET_CONNECT,
    WalletType.PROXIED,
    WalletType.POLKADOT_EXTENSION,
    WalletType.TALISMAN_EXTENSION,
    WalletType.SUBWALLET_EXTENSION,
  ])('takes the first account of %s, which signs with exactly one', type => {
    expect(getDefaultSelection(wallet(type), [first, second])).toEqual([first]);
  });

  it('selects nothing while the account list is still empty', () => {
    // The state the old code got stuck in permanently.
    expect(getDefaultSelection(wallet(WalletType.POLKADOT_VAULT), [])).toEqual([]);
    expect(getDefaultSelection(wallet(WalletType.WALLET_CONNECT), [])).toEqual([]);
  });

  it('selects nothing without a wallet', () => {
    expect(getDefaultSelection(null, [first])).toEqual([]);
  });
});
