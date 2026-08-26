import { type Draft } from '@/domains/backend';
import { type AnyAccount, accountService } from '@/domains/network';

import { hasSigningPath } from './submit-draft-availability';

/**
 * The local account the draft's assigned initiator resolves to — a wallet
 * account allowed to sign — or `null` when the user holds no such key.
 */
export const findLocalInitiator = (
  draft: Pick<Draft, 'initiatorAccountId'>,
  accounts: AnyAccount[],
): AnyAccount | null => {
  if (!draft.initiatorAccountId) return null;

  return (
    accounts.find(
      (account) => account.accountId === draft.initiatorAccountId && accountService.hasPermissionToMakeActions(account),
    ) ?? null
  );
};

/**
 * The account the user can submit this draft with: `findLocalInitiator` on a
 * draft that also carries a usable signing path. A legacy draft without a path
 * has to be recreated, so it is nobody's to sign. One rule for the Submit
 * dialog (`submit-draft-model`) and the "Signed → Not signed" filter, so the
 * two never disagree.
 */
export const findSubmittableInitiator = (
  draft: Pick<Draft, 'initiatorAccountId' | 'signingPath'>,
  accounts: AnyAccount[],
): AnyAccount | null => {
  return hasSigningPath(draft) ? findLocalInitiator(draft, accounts) : null;
};
