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
 */
export const getDraftDestinationAccountId = (
  draft: Draft | null,
  api: ApiPromise | null,
  chain: Chain | null,
): AccountId | null => {
  if (!draft?.callData || !draft.multisigAccountId || !api || !chain) return null;

  try {
    const decoded = decodeCallData(
      api,
      draft.multisigAccountId,
      draft.callData as CallData,
      getNativeAssetId(chain.assets),
    );

    return getDestinationAccountId(findCoreTransaction(decoded));
  } catch {
    return null;
  }
};
