import { type DecodedTransaction, type Transaction, TransactionType } from '@/shared/core';
import { toAccountId, validateAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { extractAccountIdFromLocation, extractBeneficiariesFromXcmInstructions } from './locationUtils';

export type XcmTransactionType =
  | TransactionType.XCM_TELEPORT
  | TransactionType.XCM_LIMITED_TRANSFER
  | TransactionType.POLKADOT_XCM_TELEPORT
  | TransactionType.POLKADOT_XCM_LIMITED_TRANSFER
  | TransactionType.POLKADOT_XCM_TRANSFER_ASSETS
  | TransactionType.POLKADOT_XCM_RESERVE_WITHDRAW
  | TransactionType.POLKADOT_XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN
  | TransactionType.XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN
  | TransactionType.XTOKENS_TRANSFER
  | TransactionType.XTOKENS_TRANSFER_MULTIASSET
  | TransactionType.XTOKENS_TRANSFER_MULTIASSETS;

/**
 * Where an XCM transfer names who it pays: a `location` arg holding the
 * recipient's account junction, or a `program` arg (`customXcmOnDest`) whose
 * deposits are the recipients.
 */
type XcmRecipientSource =
  | { kind: 'location'; arg: 'beneficiary' | 'dest' }
  | { kind: 'program'; arg: 'customXcmOnDest' };

/** Exhaustive: a new XCM call type must say where its recipients are. */
const XCM_RECIPIENT_SOURCE: Record<XcmTransactionType, XcmRecipientSource> = {
  [TransactionType.XCM_TELEPORT]: { kind: 'location', arg: 'beneficiary' },
  [TransactionType.XCM_LIMITED_TRANSFER]: { kind: 'location', arg: 'beneficiary' },
  [TransactionType.POLKADOT_XCM_TELEPORT]: { kind: 'location', arg: 'beneficiary' },
  [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: { kind: 'location', arg: 'beneficiary' },
  [TransactionType.POLKADOT_XCM_TRANSFER_ASSETS]: { kind: 'location', arg: 'beneficiary' },
  [TransactionType.POLKADOT_XCM_RESERVE_WITHDRAW]: { kind: 'location', arg: 'beneficiary' },
  [TransactionType.POLKADOT_XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN]: { kind: 'program', arg: 'customXcmOnDest' },
  [TransactionType.XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN]: { kind: 'program', arg: 'customXcmOnDest' },
  [TransactionType.XTOKENS_TRANSFER]: { kind: 'location', arg: 'dest' },
  [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: { kind: 'location', arg: 'dest' },
  [TransactionType.XTOKENS_TRANSFER_MULTIASSETS]: { kind: 'location', arg: 'dest' },
};

export const isXcmTransactionType = (type: TransactionType | undefined): type is XcmTransactionType =>
  type !== undefined && Object.hasOwn(XCM_RECIPIENT_SOURCE, type);

/**
 * A recipient location is either a plain address / account id (transactions
 * built in the app) or a versioned location — decoded call data stringifies
 * it.
 */
const getLocationAccountId = (value: unknown): AccountId | undefined => {
  if (typeof value === 'string' && validateAddress(value)) return toAccountId(value);

  return extractAccountIdFromLocation(value);
};

/**
 * Every account an XCM transfer pays. `null` for a non-XCM transaction or when
 * the transfer's recipients can't be read — never "pays no one".
 */
export const getXcmTransactionBeneficiaries = (tx: Transaction | DecodedTransaction): AccountId[] | null => {
  if (!isXcmTransactionType(tx.type)) return null;

  const source = XCM_RECIPIENT_SOURCE[tx.type];
  const value: unknown = tx.args?.[source.arg];

  if (source.kind === 'program') return extractBeneficiariesFromXcmInstructions(value);

  const beneficiary = getLocationAccountId(value);

  return beneficiary ? [beneficiary] : null;
};
