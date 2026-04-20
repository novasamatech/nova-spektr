import { type ApiPromise } from '@polkadot/api';
import { isHex } from '@polkadot/util';

import { type CallData, type Chain } from '@/shared/core';
import { transactionService } from '@/entities/transaction';

/**
 * Strict decode: if the round-tripped hex doesn't match the input, treat as
 * undecodable.
 *
 * `api.createType('Call', …)` is lenient — e.g. `0x00` is accepted as a trivial
 * call (pallet=0, call=0) even though the input is truncated. The backend
 * rejects such inputs with 422, so we mirror that strictness here: the encoded
 * call must re-produce the exact input bytes.
 */
export const tryDecodeCallData = (
  callData: string,
  api: ApiPromise | null | undefined,
  chain: Chain | null | undefined,
): object | null => {
  if (!callData || !isHex(callData) || !api || !chain) return null;

  try {
    const call = transactionService.createCallFromCallData(callData as CallData, api);
    if (!call) return null;
    if (call.toHex().toLowerCase() !== callData.toLowerCase()) return null;

    return transactionService.formatCall(call, chain);
  } catch {
    return null;
  }
};
