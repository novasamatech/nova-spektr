import { type ApiPromise } from '@polkadot/api';

import { type Chain, type DecodedTransaction, TransactionType } from '@/shared/core';
import { type RecipientCheck } from '@/shared/lib/recipient-verification';
import { toAccountId, validateAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Draft } from '@/domains/backend';
import {
  getXcmTransactionBeneficiary,
  isProxyTransaction,
  isTransferTransaction,
  isXcmTransaction,
} from '@/entities/transaction';

import { decodeDraftTransaction, getDraftOriginAccountId } from './decode-draft-transaction';

// Wrappers nested deeper than this are not walked; the recipient is then
// reported as unresolved rather than silently skipped.
const MAX_WRAPPER_DEPTH = 8;

const NO_RECIPIENT: RecipientCheck = { kind: 'no-recipient' };
const UNRESOLVED: RecipientCheck = { kind: 'unresolved' };

/**
 * Recipients of a single transfer / XCM transfer, `[]` for a call that pays no
 * one, `null` when it is a transfer whose recipient can't be read.
 */
const getOwnRecipients = (tx: DecodedTransaction): AccountId[] | null => {
  if (isXcmTransaction(tx)) {
    const beneficiary = getXcmTransactionBeneficiary(tx);

    return beneficiary ? [beneficiary] : null;
  }

  if (!isTransferTransaction(tx)) return [];

  // `toAccountId` never throws — it maps garbage to `0x00` — so validate first.
  const dest: unknown = tx.args?.dest;
  if (typeof dest !== 'string' || !validateAddress(dest)) return null;

  return [toAccountId(dest)];
};

/** Walks `proxy.proxy` and `utility.batch*` wrappers; `null` = unresolved. */
const collectRecipients = (tx: DecodedTransaction | null | undefined, depth: number): AccountId[] | null => {
  if (!tx) return [];

  const isProxy = isProxyTransaction(tx);
  if (!isProxy && tx.type !== TransactionType.BATCH_ALL) return getOwnRecipients(tx);
  if (depth >= MAX_WRAPPER_DEPTH) return null;

  const children: DecodedTransaction[] = isProxy ? [tx.args?.transaction] : (tx.args?.transactions ?? []);
  const recipients: AccountId[] = [];

  for (const child of children) {
    const childRecipients = collectRecipients(child, depth + 1);
    if (!childRecipients) return null;

    recipients.push(...childRecipients);
  }

  return recipients;
};

/**
 * Every recipient a decoded call pays — looking through proxy and batch
 * wrappers. A transfer whose recipient can't be read makes the whole call
 * `unresolved`.
 */
export const getRecipientCheck = (tx: DecodedTransaction | null): RecipientCheck => {
  const recipients = collectRecipients(tx, 0);

  if (!recipients) return UNRESOLVED;
  if (recipients.length === 0) return NO_RECIPIENT;

  return { kind: 'recipients', accountIds: [...new Set(recipients)] };
};

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
  if (!draft?.callData || !api || !chain) return NO_RECIPIENT;

  const decoded = decodeDraftTransaction({
    callData: draft.callData,
    originAccountId: getDraftOriginAccountId(draft),
    api,
    chain,
  });

  return decoded ? getRecipientCheck(decoded) : UNRESOLVED;
};

/** Account ids to show as the draft's recipients. */
export const getRecipientAccountIds = (check: RecipientCheck): AccountId[] => {
  return check.kind === 'recipients' ? check.accountIds : [];
};
