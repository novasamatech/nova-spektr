import { hexToU8a, u8aToString } from '@polkadot/util';

import { type ChainId, type Transaction, TransactionType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

// Marker remark embedded into the verify-proxy ping so an executed multisig op can be
// matched back to a specific (delegate, pure-proxy) row. Without it, ANY executed op via
// that multisig + pure pair flips the row to verified — a false positive for incidental
// ops. Lives in `shared/` so the producer (`features/proxy-verify`) and the consumer
// (`features/wallet-details/model/proxies-model`) can share it without a feature cycle.
export const VERIFY_PROXY_REMARK_KIND = 'verify-proxy';

export type VerifyProxyMarkerPayload = {
  kind: typeof VERIFY_PROXY_REMARK_KIND;
  delegateAccountId: AccountId;
  pureProxyAccountId: AccountId;
};

type BuildVerifyProxyRemarkTxParams = {
  chainId: ChainId;
  accountId: AccountId;
  delegateAccountId: AccountId;
  pureProxyAccountId: AccountId;
};

export const buildVerifyProxyRemarkTx = ({
  chainId,
  accountId,
  delegateAccountId,
  pureProxyAccountId,
}: BuildVerifyProxyRemarkTxParams): Transaction => {
  const payload: VerifyProxyMarkerPayload = {
    kind: VERIFY_PROXY_REMARK_KIND,
    delegateAccountId,
    pureProxyAccountId,
  };

  return {
    chainId,
    accountId,
    type: TransactionType.REMARK_WITH_EVENT,
    args: { remark: JSON.stringify(payload) },
  };
};

export const parseVerifyProxyMarker = (remark: string): VerifyProxyMarkerPayload | null => {
  // On-chain `system.remarkWithEvent` args come through the callDataDecoder as a 0x-prefixed
  // hex string (polkadot.js Bytes → toString()). The local-build path stores the payload as
  // the original JSON string. Accept both: hex → UTF-8 first, then JSON.
  let jsonStr = remark;
  if (remark.startsWith('0x')) {
    try {
      jsonStr = u8aToString(hexToU8a(remark));
    } catch {
      return null;
    }
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  if (obj['kind'] !== VERIFY_PROXY_REMARK_KIND) return null;
  const delegate = obj['delegateAccountId'];
  const pure = obj['pureProxyAccountId'];
  if (typeof delegate !== 'string' || typeof pure !== 'string') return null;
  return {
    kind: VERIFY_PROXY_REMARK_KIND,
    delegateAccountId: toAccountId(delegate),
    pureProxyAccountId: toAccountId(pure),
  };
};
