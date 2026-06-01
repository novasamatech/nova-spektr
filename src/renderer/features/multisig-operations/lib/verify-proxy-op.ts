import { type DecodedTransaction } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { parseVerifyProxyMarker } from '@/shared/transactions';
import { type MultisigOperation } from '@/domains/network';

export type VerifyProxyOpInfo = {
  // The new proxy whose access is being proven (subject of the verification).
  delegateAccountId: AccountId;
  // The pure proxy through which the ping is dispatched (`real` of proxy.proxy).
  pureProxyAccountId: AccountId;
  memo?: string;
};

const isProxyWrap = (tx: DecodedTransaction): boolean => tx.section === 'proxy' && tx.method === 'proxy';
const BATCH_METHODS = new Set(['batch', 'batchAll', 'forceBatch']);

const findVerifyProxyRemark = (tx: DecodedTransaction | null): DecodedTransaction | null => {
  if (nullable(tx)) return null;

  if (isProxyWrap(tx)) {
    const inner = (tx.args['transaction'] as DecodedTransaction | null) ?? null;
    if (nullable(inner)) return null;

    if (inner.section === 'system' && inner.method === 'remarkWithEvent') {
      return inner;
    }

    return findVerifyProxyRemark(inner);
  }

  if (tx.section === 'utility' && BATCH_METHODS.has(tx.method)) {
    const transactions = tx.args['transactions'];
    if (!Array.isArray(transactions)) return null;

    for (const child of transactions as DecodedTransaction[]) {
      const found = findVerifyProxyRemark(child);
      if (found) return found;
    }
  }

  return null;
};

// Verify-proxy ping shape: `proxy.proxy(real=pure, call=system.remarkWithEvent(<verify-proxy marker>))`.
// We require the proxy.proxy wrap (a bare remarkWithEvent isn't how the ping is built — see
// `features/proxy-verify/lib/build-verify-proxy.ts`), and additionally require the marker payload
// so incidental proxy.remarkWithEvent ops don't render here.
export const parseVerifyProxyOperation = (operation: MultisigOperation): VerifyProxyOpInfo | null => {
  const inner = findVerifyProxyRemark(operation.transaction);
  if (nullable(inner)) return null;
  const remark = inner.args['remark'];
  if (typeof remark !== 'string') return null;
  const payload = parseVerifyProxyMarker(remark);
  if (!payload) return null;
  return {
    delegateAccountId: payload.delegateAccountId,
    pureProxyAccountId: payload.pureProxyAccountId,
    ...(payload.memo ? { memo: payload.memo } : {}),
  };
};

export const isVerifyProxyOperation = (operation: MultisigOperation): boolean =>
  parseVerifyProxyOperation(operation) !== null;
