// Not the `@/shared/api/xcm` barrel: that would pull the heavy XCM SDK into this module's import graph.
import { getXcmTransactionBeneficiaries } from '@/shared/api/xcm/lib/beneficiaries';
import { type DecodedTransaction, TransactionType } from '@/shared/core';
import { toAccountId, validateAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type RecipientCheck } from './resolveRecipientWarning';

// Wrappers nested deeper than this are not walked; the recipient is then
// reported as unresolved rather than silently skipped.
const MAX_WRAPPER_DEPTH = 8;

const NO_RECIPIENT: RecipientCheck = { kind: 'no-recipient' };
const UNRESOLVED: RecipientCheck = { kind: 'unresolved' };

/**
 * How a call names the accounts it pays.
 *
 * - `none` — the call moves no funds to anyone.
 * - `arg` — the account in arg `name`; `optional` when an absent arg means the
 *   call pays the caller (salary `payout()` vs `payoutOther(beneficiary)`).
 * - `payee` — a reward destination: an account only for the `Account` payee.
 * - `xcm` — the beneficiaries of an XCM transfer.
 * - `proxy` / `batch` — wrappers: the recipients of the wrapped call(s).
 * - `unresolved` — the call does (or may) pay someone, but the check can't read
 *   whom. A call the check doesn't understand is never "nothing to check".
 */
type RecipientRule =
  | { kind: 'none' }
  | { kind: 'arg'; name: string; optional?: boolean }
  | { kind: 'payee' }
  | { kind: 'xcm' }
  | { kind: 'proxy' }
  | { kind: 'batch' }
  | { kind: 'unresolved' };

const NONE: RecipientRule = { kind: 'none' };
const XCM: RecipientRule = { kind: 'xcm' };
const PAYEE: RecipientRule = { kind: 'payee' };
const UNREADABLE: RecipientRule = { kind: 'unresolved' };
const arg = (name: string, optional?: boolean): RecipientRule => ({ kind: 'arg', name, optional });

/** Exhaustive: a new call type must decide whom it pays before it compiles. */
const RECIPIENT_RULES: Record<TransactionType, RecipientRule> = {
  [TransactionType.TRANSFER]: arg('dest'),
  [TransactionType.TRANSFER_ALLOW_DEATH]: arg('dest'),
  [TransactionType.TRANSFER_ALL]: arg('dest'),
  [TransactionType.ORML_TRANSFER]: arg('dest'),
  [TransactionType.ASSET_TRANSFER]: arg('dest'),
  [TransactionType.VESTED_TRANSFER]: arg('target'),
  [TransactionType.VEST]: NONE,

  [TransactionType.MULTISIG_AS_MULTI]: UNREADABLE,
  [TransactionType.MULTISIG_APPROVE_AS_MULTI]: UNREADABLE,
  [TransactionType.MULTISIG_CANCEL_AS_MULTI]: NONE,

  [TransactionType.XCM_LIMITED_TRANSFER]: XCM,
  [TransactionType.XCM_TELEPORT]: XCM,
  [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: XCM,
  [TransactionType.POLKADOT_XCM_TELEPORT]: XCM,
  [TransactionType.POLKADOT_XCM_TRANSFER_ASSETS]: XCM,
  [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: XCM,
  [TransactionType.POLKADOT_XCM_RESERVE_WITHDRAW]: XCM,
  [TransactionType.POLKADOT_XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN]: XCM,
  [TransactionType.XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN]: XCM,
  [TransactionType.XTOKENS_TRANSFER]: XCM,
  [TransactionType.XTOKENS_TRANSFER_MULTIASSETS]: XCM,

  [TransactionType.BOND]: PAYEE,
  [TransactionType.STAKE_MORE]: NONE,
  [TransactionType.UNSTAKE]: NONE,
  [TransactionType.RESTAKE]: NONE,
  [TransactionType.REDEEM]: NONE,
  [TransactionType.NOMINATE]: NONE,
  [TransactionType.BATCH_ALL]: { kind: 'batch' },
  [TransactionType.DESTINATION]: PAYEE,
  [TransactionType.CHILL]: NONE,
  [TransactionType.PAYOUT_STAKERS_BY_PAGE]: NONE,

  [TransactionType.ADD_PROXY]: arg('delegate'),
  [TransactionType.REMOVE_PROXY]: NONE,
  [TransactionType.PROXY]: { kind: 'proxy' },
  [TransactionType.CREATE_PURE_PROXY]: NONE,
  [TransactionType.KILL_PURE_PROXY]: NONE,

  [TransactionType.REMARK]: NONE,
  [TransactionType.REMARK_WITH_EVENT]: NONE,

  [TransactionType.UNLOCK]: NONE,
  [TransactionType.VOTE]: NONE,
  [TransactionType.REMOVE_VOTE]: NONE,
  [TransactionType.DELEGATE]: arg('target'),
  [TransactionType.UNDELEGATE]: NONE,
  [TransactionType.EDIT_DELEGATION]: arg('target'),

  [TransactionType.COLLECTIVE_VOTE]: NONE,
  [TransactionType.COLLECTIVE_SET_ACTIVE]: NONE,
  [TransactionType.COLLECTIVE_SALARY_INDUCT]: NONE,
  [TransactionType.COLLECTIVE_SALARY_REQUEST]: NONE,
  [TransactionType.COLLECTIVE_SALARY_PAYOUT]: arg('beneficiary', true),
  [TransactionType.COLLECTIVE_SUBMIT_EVIDENCE]: NONE,
  [TransactionType.COLLECTIVE_EVIDENCE_VOTE]: NONE,
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
 * Rewards go to an account only for the `Account` payee (the decoder normalises
 * it to `{ Account }`).
 */
const readPayee = (payee: unknown): AccountId[] | null => {
  return isRecord(payee) && 'Account' in payee ? readRecipient(payee.Account) : [];
};

/** The calls a wrapper runs; `null` when they aren't there to read. */
const getWrappedCalls = (tx: DecodedTransaction, kind: 'proxy' | 'batch'): unknown[] | null => {
  if (kind === 'proxy') return [tx.args?.transaction];

  const transactions: unknown = tx.args?.transactions;

  return Array.isArray(transactions) ? transactions : null;
};

/** Walks `proxy.proxy` and `utility.batch*` wrappers; `null` = unresolved. */
const collectRecipients = (tx: DecodedTransaction, depth: number): AccountId[] | null => {
  // A type the table has no rule for (stored by another build) is unreadable.
  if (!tx.type || !Object.hasOwn(RECIPIENT_RULES, tx.type)) return null;

  const rule = RECIPIENT_RULES[tx.type];

  switch (rule.kind) {
    case 'none':
      return [];
    case 'unresolved':
      return null;
    case 'xcm':
      return getXcmTransactionBeneficiaries(tx);
    case 'payee':
      return readPayee(tx.args?.payee);
    case 'arg': {
      const value: unknown = tx.args?.[rule.name];
      if (rule.optional && (value === null || value === undefined)) return [];

      return readRecipient(value);
    }
    case 'proxy':
    case 'batch': {
      if (depth >= MAX_WRAPPER_DEPTH) return null;

      const children = getWrappedCalls(tx, rule.kind);
      if (!children) return null;

      const recipients: AccountId[] = [];

      for (const child of children) {
        // A wrapper whose inner call didn't decode can't be read.
        if (!isDecodedTransaction(child)) return null;

        const childRecipients = collectRecipients(child, depth + 1);
        if (!childRecipients) return null;

        recipients.push(...childRecipients);
      }

      return recipients;
    }
  }
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
