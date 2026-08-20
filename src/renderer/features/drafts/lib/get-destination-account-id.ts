import { type ApiPromise } from '@polkadot/api';

import { type CallData, type Chain, type DecodedTransaction } from '@/shared/core';
import { getNativeAssetId, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Draft } from '@/domains/backend';
import {
  decodeCallData,
  findCoreTransaction,
  getXcmTransactionBeneficiary,
  isTransferTransaction,
  isXcmTransaction,
} from '@/entities/transaction';

import { tryDecodeCallData } from './decode-call-data';

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
 * Destination of a stored draft: decodes its call data against the chain api
 * and reads the core transfer's recipient. `null` for non-transfer drafts,
 * drafts without call data, and whenever decoding is not possible yet.
 *
 * The decode origin is the draft's source — the multisig, or the proxied
 * account for proxy-only drafts. It only labels the transaction's sender and
 * never influences the recipient that is read back.
 */
export const getDraftDestinationAccountId = (
  draft: Draft | null,
  api: ApiPromise | null,
  chain: Chain | null,
): AccountId | null => {
  const origin = draft?.multisigAccountId ?? draft?.proxyAccountId;
  if (!draft?.callData || !origin || !api || !chain) return null;

  // Same strictness as the call-data step: bytes that don't round-trip are not
  // a transaction we should derive a recipient from.
  if (!tryDecodeCallData(draft.callData, api, chain)) return null;

  try {
    const decoded = decodeCallData(api, origin, draft.callData as CallData, getNativeAssetId(chain.assets));

    return getDestinationAccountId(findCoreTransaction(decoded));
  } catch {
    return null;
  }
};
