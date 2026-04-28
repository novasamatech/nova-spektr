import { hexToU8a, u8aToString } from '@polkadot/util';

import { type ChainId, type Transaction, TransactionType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

// Marker remark mixed into the verified-flow batch so it can be told apart from a plain
// `proxy.addProxy` extrinsic. Trusted flow stays identifiable by its `removeProxy` half,
// so it doesn't need the marker. Lives in `shared/` so both the producer
// (`flexible-change-signatories`) and the consumer (`multisig-operations` parser) can
// reach it without forming a cross-feature import cycle.
export const EDIT_FLEXIBLE_CONTROLLER_REMARK_KIND = 'edit-flexible-controller';

export type EditControllerMarkerPayload = {
  kind: typeof EDIT_FLEXIBLE_CONTROLLER_REMARK_KIND;
  oldControllerAccountId: AccountId;
};

type BuildEditControllerMarkerTxParams = {
  chainId: ChainId;
  accountId: AccountId;
  oldControllerAccountId: AccountId;
};

export const buildEditControllerMarkerTx = ({
  chainId,
  accountId,
  oldControllerAccountId,
}: BuildEditControllerMarkerTxParams): Transaction => {
  const payload: EditControllerMarkerPayload = {
    kind: EDIT_FLEXIBLE_CONTROLLER_REMARK_KIND,
    oldControllerAccountId,
  };

  return {
    chainId,
    accountId,
    type: TransactionType.REMARK,
    args: { remark: JSON.stringify(payload) },
  };
};

export const parseEditControllerMarker = (remark: string): EditControllerMarkerPayload | null => {
  // On-chain `system.remark` args come through the callDataDecoder as a 0x-prefixed
  // hex string (polkadot.js Bytes → toString()). The local-build path stores the
  // payload as the original JSON string. Accept both: hex → UTF-8 first, then JSON.
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
  if (obj['kind'] !== EDIT_FLEXIBLE_CONTROLLER_REMARK_KIND) return null;
  const oldId = obj['oldControllerAccountId'];
  if (typeof oldId !== 'string') return null;
  return {
    kind: EDIT_FLEXIBLE_CONTROLLER_REMARK_KIND,
    oldControllerAccountId: toAccountId(oldId),
  };
};
