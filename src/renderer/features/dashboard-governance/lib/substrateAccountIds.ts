import { isSubstrateAccountId, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

/**
 * The selected accounts that can exist on a Substrate chain at all.
 *
 * The dashboard's selection mixes wallets of every kind, and an Ethereum key (a
 * 20-byte id) has no `votingFor` or `classLocksFor` key on Polkadot or Kusama
 * Asset Hub. One such id in a `multi` batch fails to encode and the whole
 * subscription rejects, so nothing on the tab ever loads for anyone.
 */
export function toSubstrateAccountIds(accountIds: string[]): AccountId[] {
  return accountIds.filter((id) => isSubstrateAccountId(id)).map((id) => toAccountId(id));
}
