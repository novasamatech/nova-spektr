import { type ApiPromise } from '@polkadot/api';

import { type Chain } from '@/shared/core';
import { type RecipientCheck, getRecipientCheck } from '@/shared/lib/recipient-verification';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Draft } from '@/domains/backend';

import { decodeDraftTransaction, getDraftOriginAccountId } from './decode-draft-transaction';

/**
 * Recipient check of a stored draft. `no-recipient` while there is nothing to
 * decode yet (no call data, or the chain's api is not connected — nothing can
 * be signed then either). Call data that is present but doesn't decode is
 * `unresolved`: an unreadable recipient is never "nothing to check".
 */
export const getDraftRecipientCheck = (
  draft: Draft | null,
  api: ApiPromise | null,
  chain: Chain | null,
): RecipientCheck => {
  if (!draft?.callData || !api || !chain) return { kind: 'no-recipient' };

  const decoded = decodeDraftTransaction({
    callData: draft.callData,
    originAccountId: getDraftOriginAccountId(draft),
    api,
    chain,
  });

  return decoded ? getRecipientCheck(decoded) : { kind: 'unresolved' };
};

/** Account ids to show as the draft's recipients. */
export const getRecipientAccountIds = (check: RecipientCheck): AccountId[] => {
  return check.kind === 'recipients' ? check.accountIds : [];
};
