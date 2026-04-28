import { type DecodedTransaction, type ProxyType } from '@/shared/core';
import { nullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EditControllerMarkerPayload, parseEditControllerMarker } from '@/shared/transactions';
import { type MultisigOperation } from '@/domains/network';

export type ProxyEditInfo = {
  newControllerAccountId: AccountId;
  oldControllerAccountId: AccountId;
  proxyType: ProxyType;
  isTrustedFlow: boolean;
};

const BATCH_METHODS = new Set(['batch', 'batchAll', 'forceBatch']);

const isAddProxy = (tx: DecodedTransaction): boolean =>
  tx.section === 'proxy' && (tx.method === 'addProxy' || tx.method === 'addProxyWithDelay');

const isRemoveProxy = (tx: DecodedTransaction): boolean => tx.section === 'proxy' && tx.method === 'removeProxy';

// Plain `system.remark` only — the outer new-controller metadata wrap uses
// `system.remarkWithEvent`, and we deliberately don't conflate the two.
const isPlainRemark = (tx: DecodedTransaction): boolean => tx.section === 'system' && tx.method === 'remark';

// Locate the inner batch that defines an edit-flexible op.
//
// Production shape is `proxy.proxy(real, call=batchAll([addProxy, removeProxy|marker]))`.
// When the new-controller multisig isn't known locally, the producer wraps that proxy.proxy
// in an outer batchAll alongside a `system.remarkWithEvent` carrying new-ctrl metadata
// (see `change-signatories-model.ts > $coreTx`). We accept either shape:
//   - A batch that directly contains addProxy is treated as the edit batch.
//   - A batch with no addProxy at this level is recursed into: any proxy.proxy child
//     gets unwrapped and its inner batch is returned.
const findEditFlexibleBatch = (tx: DecodedTransaction | null): DecodedTransaction[] | null => {
  if (nullable(tx)) return null;

  if (tx.section === 'proxy' && tx.method === 'proxy') {
    const inner = (tx.args['transaction'] as DecodedTransaction | null) ?? null;
    return findEditFlexibleBatch(inner);
  }

  if (tx.section === 'utility' && BATCH_METHODS.has(tx.method)) {
    const txs = tx.args['transactions'];
    if (!Array.isArray(txs)) return null;
    const arr = txs as DecodedTransaction[];
    // Direct hit: this batch is the edit batch itself.
    if (arr.some(isAddProxy)) return arr;
    // Otherwise walk children — supports the outer-wrap-with-metadata-remark shape.
    for (const child of arr) {
      const found = findEditFlexibleBatch(child);
      if (found) return found;
    }
  }

  return null;
};

type ProxyArgs = { delegate: AccountId; proxyType: ProxyType };

const extractProxyArgs = (tx: DecodedTransaction): ProxyArgs | null => {
  const delegate = tx.args['delegate'];
  const proxyType = tx.args['proxyType'];
  if (typeof delegate !== 'string' || typeof proxyType !== 'string') return null;
  return { delegate: toAccountId(delegate), proxyType: proxyType as ProxyType };
};

const findMarker = (txs: DecodedTransaction[]): EditControllerMarkerPayload | null => {
  for (const tx of txs) {
    if (!isPlainRemark(tx)) continue;
    const remark = tx.args['remark'];
    if (typeof remark !== 'string') continue;
    const payload = parseEditControllerMarker(remark);
    if (payload) return payload;
  }
  return null;
};

export const parseProxyEditOperation = (operation: MultisigOperation): ProxyEditInfo | null => {
  // Bare `add_proxy` (no batch) is a plain proxy addition — not our edit-flexible flow,
  // so we deliberately require the proxy.proxy → batchAll structure (handled by
  // findEditFlexibleBatch).
  const batched = findEditFlexibleBatch(operation.transaction);
  if (!batched) return null;

  const addTx = batched.find(isAddProxy);
  if (!addTx) return null;
  const addArgs = extractProxyArgs(addTx);
  if (nullable(addArgs)) return null;

  const removeTx = batched.find(isRemoveProxy);
  if (removeTx) {
    const removeArgs = extractProxyArgs(removeTx);
    if (nullable(removeArgs)) return null;
    return {
      newControllerAccountId: addArgs.delegate,
      oldControllerAccountId: removeArgs.delegate,
      proxyType: addArgs.proxyType,
      isTrustedFlow: true,
    };
  }

  const marker = findMarker(batched);
  if (marker) {
    return {
      newControllerAccountId: addArgs.delegate,
      oldControllerAccountId: marker.oldControllerAccountId,
      proxyType: addArgs.proxyType,
      isTrustedFlow: false,
    };
  }

  return null;
};

export const isProxyEditOperation = (operation: MultisigOperation): boolean =>
  parseProxyEditOperation(operation) !== null;
