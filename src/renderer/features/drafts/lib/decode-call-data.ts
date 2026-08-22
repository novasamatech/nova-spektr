import { type ApiPromise } from '@polkadot/api';
import { isHex } from '@polkadot/util';

import { type CallData, type Chain } from '@/shared/core';
import { transactionService } from '@/entities/transaction';

/**
 * Builds a `Call` from hex only when the bytes round-trip exactly.
 *
 * `api.createType('Call', …)` is lenient — e.g. `0x00` is accepted as a trivial
 * call (pallet=0, call=0) even though the input is truncated. The backend
 * rejects such inputs with 422, so we mirror that strictness here: the encoded
 * call must re-produce the exact input bytes. `null` when it doesn't, or when
 * the api can't parse the input at all.
 */
type RoundTrippedCall = NonNullable<ReturnType<typeof transactionService.createCallFromCallData>>;

export const createRoundTrippedCall = (
  callData: string,
  api: ApiPromise | null | undefined,
): RoundTrippedCall | null => {
  if (!callData || !isHex(callData) || !api) return null;

  try {
    const call = transactionService.createCallFromCallData(callData as CallData, api);
    if (!call) return null;

    return call.toHex().toLowerCase() === callData.toLowerCase() ? call : null;
  } catch {
    return null;
  }
};

/**
 * Strict decode into the human-readable call shape used by the JSON views.
 * `null` when the call data doesn't round-trip (see `createRoundTrippedCall`).
 */
export const tryDecodeCallData = (
  callData: string,
  api: ApiPromise | null | undefined,
  chain: Chain | null | undefined,
): object | null => {
  const call = createRoundTrippedCall(callData, api);
  if (!call || !chain) return null;

  try {
    return transactionService.formatCall(call, chain);
  } catch {
    return null;
  }
};
