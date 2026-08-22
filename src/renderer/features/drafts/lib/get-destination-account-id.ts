import { type ApiPromise } from '@polkadot/api';

import { type Chain, type DecodedTransaction } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Draft } from '@/domains/backend';
import {
  findCoreTransaction,
  getXcmTransactionBeneficiary,
  isTransferTransaction,
  isXcmTransaction,
} from '@/entities/transaction';

import { decodeDraftTransaction, getDraftOriginAccountId } from './decode-draft-transaction';

/**
 * Recipient of a decoded core transaction: XCM beneficiary or transfer `dest`;
 * `null` for anything else.
 */
export const getDestinationAccountId = (coreTx: DecodedTransaction | null): AccountId | null => {
  if (!coreTx) return null;

  if (isXcmTransaction(coreTx)) {
    return getXcmTransactionBeneficiary(coreTx) ?? null;
  }

  if (!isTransferTransaction(coreTx) || !coreTx.args?.dest) return null;

  try {
    return toAccountId(coreTx.args.dest);
  } catch {
    return null;
  }
};

/**
 * Recipient of a stored draft. `null` for non-transfer drafts, drafts without
 * call data, and whenever decoding is not possible yet (see
 * `decodeDraftTransaction`).
 */
export const getDraftDestinationAccountId = (
  draft: Draft | null,
  api: ApiPromise | null,
  chain: Chain | null,
): AccountId | null => {
  if (!draft) return null;

  const decoded = decodeDraftTransaction({
    callData: draft.callData,
    originAccountId: getDraftOriginAccountId(draft),
    api,
    chain,
  });

  return getDestinationAccountId(findCoreTransaction(decoded));
};
