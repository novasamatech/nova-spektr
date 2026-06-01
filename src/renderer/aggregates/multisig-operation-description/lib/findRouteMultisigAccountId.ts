import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

/**
 * Returns the multisig accountId reached by an operation's resolved
 * signing-path route, or null when the route has no multisig. The route is
 * detected the same way the multisig deposit is
 * (`route.find(isAnyMultisigAccount)`), so it works for a multisig signed
 * directly AND for one reached via a proxy — in both cases the multisig account
 * is present in the route.
 *
 * For a flexible multisig the inner `multisigAccountId` is returned (that's the
 * id operation descriptions are keyed by on the backend); a regular multisig
 * returns its own `accountId`.
 */
export function findRouteMultisigAccountId(route: AnyAccount[]): AccountId | null {
  const multisig = route.find(accountUtils.isAnyMultisigAccount);
  if (!multisig) return null;

  return accountUtils.isFlexibleMultisigAccount(multisig) ? multisig.multisigAccountId : multisig.accountId;
}
