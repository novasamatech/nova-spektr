import { type ApiPromise } from '@polkadot/api';

import { type Chain, type DecodedTransaction, TransactionType } from '@/shared/core';
import { type RecipientCheck } from '@/shared/lib/recipient-verification';
import { toAccountId, validateAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Draft } from '@/domains/backend';
import { getXcmTransactionBeneficiaries, isProxyTransaction, isXcmTransaction } from '@/entities/transaction';

import { decodeDraftTransaction, getDraftOriginAccountId } from './decode-draft-transaction';

// Wrappers nested deeper than this are not walked; the recipient is then
// reported as unresolved rather than silently skipped.
const MAX_WRAPPER_DEPTH = 8;

const NO_RECIPIENT: RecipientCheck = { kind: 'no-recipient' };
const UNRESOLVED: RecipientCheck = { kind: 'unresolved' };

/**
 * Calls known to move no funds to anyone. Every call outside this list and the
 * recipient-bearing ones below is treated as unreadable (`unresolved`) — a call
 * the check doesn't understand is never "nothing to check".
 */
const NO_RECIPIENT_TYPES = new Set<TransactionType>([
  TransactionType.VEST,
  TransactionType.MULTISIG_CANCEL_AS_MULTI,
  TransactionType.STAKE_MORE,
  TransactionType.UNSTAKE,
  TransactionType.RESTAKE,
  TransactionType.REDEEM,
  TransactionType.NOMINATE,
  TransactionType.CHILL,
  TransactionType.PAYOUT_STAKERS_BY_PAGE,
  TransactionType.REMOVE_PROXY,
  TransactionType.CREATE_PURE_PROXY,
  TransactionType.KILL_PURE_PROXY,
  TransactionType.REMARK,
  TransactionType.REMARK_WITH_EVENT,
  TransactionType.UNLOCK,
  TransactionType.VOTE,
  TransactionType.REMOVE_VOTE,
  TransactionType.UNDELEGATE,
  TransactionType.COLLECTIVE_VOTE,
  TransactionType.COLLECTIVE_SET_ACTIVE,
  TransactionType.COLLECTIVE_SALARY_INDUCT,
  TransactionType.COLLECTIVE_SALARY_REQUEST,
  TransactionType.COLLECTIVE_SUBMIT_EVIDENCE,
  TransactionType.COLLECTIVE_EVIDENCE_VOTE,
]);

/** The arg naming the account a call pays, for calls that always name one. */
const RECIPIENT_ARG: Partial<Record<TransactionType, string>> = {
  [TransactionType.TRANSFER]: 'dest',
  [TransactionType.TRANSFER_ALLOW_DEATH]: 'dest',
  [TransactionType.TRANSFER_ALL]: 'dest',
  [TransactionType.ORML_TRANSFER]: 'dest',
  [TransactionType.ASSET_TRANSFER]: 'dest',
  [TransactionType.VESTED_TRANSFER]: 'target',
  [TransactionType.ADD_PROXY]: 'delegate',
  [TransactionType.DELEGATE]: 'target',
  [TransactionType.EDIT_DELEGATION]: 'target',
};

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object';
const isDecodedTransaction = (value: unknown): value is DecodedTransaction =>
  isRecord(value) && typeof value.section === 'string' && typeof value.method === 'string';

/** `[accountId]` of an address arg, `null` when it isn't one. */
const readRecipient = (value: unknown): AccountId[] | null => {
  // `toAccountId` never throws — it maps garbage to `0x00` — so validate first.
  if (typeof value !== 'string' || !validateAddress(value)) return null;

  return [toAccountId(value)];
};

/**
 * Recipients of a single call: `[]` for one that pays no one, `null` when it
 * does (or may) but the recipient can't be read.
 */
const getOwnRecipients = (tx: DecodedTransaction): AccountId[] | null => {
  const { type, args } = tx;
  if (!type) return null;
  if (NO_RECIPIENT_TYPES.has(type)) return [];
  if (isXcmTransaction(tx)) return getXcmTransactionBeneficiaries(tx);

  const recipientArg = RECIPIENT_ARG[type];
  if (recipientArg) return readRecipient(args?.[recipientArg]);

  // Rewards go to an account only for the `Account` payee.
  if (type === TransactionType.BOND || type === TransactionType.DESTINATION) {
    const payee: unknown = args?.payee;

    return isRecord(payee) && 'Account' in payee ? readRecipient(payee.Account) : [];
  }

  // `payout()` pays the caller, `payoutOther(beneficiary)` someone else.
  if (type === TransactionType.COLLECTIVE_SALARY_PAYOUT) {
    const beneficiary: unknown = args?.beneficiary;

    return beneficiary === null || beneficiary === undefined ? [] : readRecipient(beneficiary);
  }

  return null;
};

/** Walks `proxy.proxy` and `utility.batch*` wrappers; `null` = unresolved. */
const collectRecipients = (tx: DecodedTransaction, depth: number): AccountId[] | null => {
  const isProxy = isProxyTransaction(tx);
  if (!isProxy && tx.type !== TransactionType.BATCH_ALL) return getOwnRecipients(tx);
  if (depth >= MAX_WRAPPER_DEPTH) return null;

  const children: unknown[] = isProxy ? [tx.args?.transaction] : (tx.args?.transactions ?? []);
  const recipients: AccountId[] = [];

  for (const child of children) {
    // A wrapper whose inner call didn't decode can't be read.
    if (!isDecodedTransaction(child)) return null;

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
  const recipients = tx ? collectRecipients(tx, 0) : [];

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
