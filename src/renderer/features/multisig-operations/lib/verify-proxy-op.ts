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
  remark?: string;
};

const isProxyWrap = (tx: DecodedTransaction): boolean => tx.section === 'proxy' && tx.method === 'proxy';
const BATCH_METHODS = new Set(['batch', 'batchAll', 'forceBatch']);

const findVerifyProxyRemark = (tx: DecodedTransaction | null): DecodedTransaction | null => {
  if (nullable(tx)) return null;

  if (tx.section === 'system' && tx.method === 'remarkWithEvent') {
    return tx;
  }

  if (isProxyWrap(tx)) {
    return findVerifyProxyRemark((tx.args['transaction'] as DecodedTransaction | null) ?? null);
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

// The ping is built as `proxy.proxy(real=pure, call=system.remarkWithEvent(<verify-proxy marker>))`
// (see `features/proxy-verify/lib/build-verify-proxy.ts`), but the multisig-operation domain decodes
// the CORE call data (proxy wrap stripped into `proxiedAccountId` — domains/network/multisig-operation
// resource), so the stored transaction is often a bare `system.remarkWithEvent`. Accept the remark at
// any of these levels; the verify-proxy marker payload is the discriminator that keeps incidental
// remarkWithEvent ops from rendering here.
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
    ...(payload.remark ? { remark: payload.remark } : {}),
  };
};

export const isVerifyProxyOperation = (operation: MultisigOperation): boolean =>
  parseVerifyProxyOperation(operation) !== null;
