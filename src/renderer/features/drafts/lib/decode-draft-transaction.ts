import { type ApiPromise } from '@polkadot/api';

import { type Chain, type DecodedTransaction } from '@/shared/core';
import { getNativeAssetId, isHex } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Draft, type PathNode } from '@/domains/backend';
import { decodeCallData } from '@/entities/transaction';

import { createRoundTrippedCall } from './decode-call-data';

type DecodeDraftTransactionParams = {
  callData: string | null | undefined;
  /**
   * Account the call is executed from. It only labels the transaction's sender
   * — the decoded call, and any recipient read from it, is the same whichever
   * account is passed.
   */
  originAccountId: AccountId | null | undefined;
  api: ApiPromise | null | undefined;
  chain: Chain | null | undefined;
};

/**
 * The single way a draft's call data becomes a `DecodedTransaction`: strict
 * round-trip check first (truncated bytes that the lenient decoder would still
 * accept are rejected), then the full decode. `null` whenever any input is
 * missing or the bytes don't decode for this chain.
 */
export const decodeDraftTransaction = ({
  callData,
  originAccountId,
  api,
  chain,
}: DecodeDraftTransactionParams): DecodedTransaction | null => {
  if (!callData || !isHex(callData) || !originAccountId || !api || !chain) return null;
  if (!createRoundTrippedCall(callData, api)) return null;

  try {
    return decodeCallData(api, originAccountId, callData, getNativeAssetId(chain.assets));
  } catch {
    return null;
  }
};

/**
 * Decode origin of a stored draft: its multisig, or the proxied account for
 * proxy-only drafts.
 */
export const getDraftOriginAccountId = (draft: Draft): AccountId | null => {
  return draft.multisigAccountId ?? draft.proxyAccountId ?? null;
};

/**
 * Decode origin of a signing path being authored: the innermost multisig hop,
 * or the path root.
 */
export const getPathOriginAccountId = (path: PathNode[]): AccountId | null => {
  return path.findLast((node) => node.kind === 'multisig')?.accountId ?? path[0]?.accountId ?? null;
};
