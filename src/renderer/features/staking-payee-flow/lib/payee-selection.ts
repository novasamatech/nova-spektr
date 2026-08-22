import { type Address } from '@/shared/core';
import { toAccountId, toAddress, validateAddress } from '@/shared/lib/utils';
import { type Payee } from '@/domains/staking';
import { type PayeeSelection } from '../types';

/** What `buildSetPayee` turns into `Staked`. */
export const RESTAKE_DESTINATION: Address = toAddress('');

const isAccountPayee = (payee: Payee | null): payee is { Account: string } =>
  payee !== null && typeof payee === 'object' && 'Account' in payee;

/**
 * The form's starting point, read off the position's current payee.
 *
 * `Stash` and `Controller` cannot be re-selected (the builder does not encode
 * them), so they open on "Transferable" with the stash filled in — the closest
 * thing the user can actually submit, and the one they most likely mean.
 */
export function toInitialSelection(payee: Payee | null, stashAddress: Address): PayeeSelection {
  if (isAccountPayee(payee)) return { option: 'account', address: payee.Account };
  if (payee === 'Stash' || payee === 'Controller') return { option: 'account', address: stashAddress };

  return { option: 'restake', address: '' };
}

const isSameAccount = (left: string, right: string): boolean => {
  if (!validateAddress(left) || !validateAddress(right)) return false;

  return toAccountId(left) === toAccountId(right);
};

/**
 * Whether submitting would change anything on chain.
 *
 * Compared against the _payee_, not the initial form state: `Stash` opens with
 * the stash address filled in, yet `{ Account: stash }` is a different variant
 * on chain, so submitting it is a real change. An unread payee (`null`) makes
 * everything a change — refusing to submit over a value nobody has seen would
 * be guessing.
 */
export function hasSelectionChanged(current: Payee | null, selection: PayeeSelection): boolean {
  if (selection.option === 'restake') return current !== 'Staked';

  return !isAccountPayee(current) || !isSameAccount(current.Account, selection.address);
}

/**
 * The `destination` argument of `transactionBuilder.buildSetPayee`.
 *
 * The model only calls this behind a `validateAddress` gate, so the fallback
 * for an invalid address is never reached in practice — it just keeps the
 * return type honest without a cast.
 */
export function toDestination(selection: PayeeSelection): Address {
  if (selection.option === 'restake') return RESTAKE_DESTINATION;

  return validateAddress(selection.address) ? selection.address : RESTAKE_DESTINATION;
}
