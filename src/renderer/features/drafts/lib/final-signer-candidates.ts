import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { deriveInitiatorAccountId, deriveMultisigAccountId } from '@/features/signing-path';

type MultisigSignatoriesLookup = ReadonlyMap<AccountId, { signatories: AccountId[] }>;

/**
 * Final-signer candidates for a signing path: the signatories of the path's
 * deepest multisig, minus the leaf signer that initiates the operation.
 *
 * Returns `[]` when the path has no multisig (feature hidden) or when that
 * multisig isn't present in the lookup (e.g. not in own wallets / address
 * book).
 */
export function deriveFinalSignerCandidates(
  path: PathNode[],
  multisigByAccountId: MultisigSignatoriesLookup,
): AccountId[] {
  const multisigId = deriveMultisigAccountId(path);
  if (multisigId === null) return [];

  const multisig = multisigByAccountId.get(multisigId);
  if (!multisig) return [];

  const initiator = deriveInitiatorAccountId(path);

  return multisig.signatories.filter((accountId) => accountId !== initiator);
}
