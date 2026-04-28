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

const unwrapProxy = (tx: DecodedTransaction | null): DecodedTransaction | null => {
  if (nullable(tx)) return null;
  if (tx.section === 'proxy' && tx.method === 'proxy') {
    const inner = tx.args['transaction'];
    return unwrapProxy((inner as DecodedTransaction | null) ?? null);
  }
  return tx;
};

const getBatchedTxs = (tx: DecodedTransaction): DecodedTransaction[] | null => {
  if (tx.section !== 'utility' || !BATCH_METHODS.has(tx.method)) return null;
  const txs = tx.args['transactions'];
  return Array.isArray(txs) ? (txs as DecodedTransaction[]) : null;
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
  const inner = unwrapProxy(operation.transaction);
  if (nullable(inner)) return null;

  // Bare `add_proxy` (no batch) is a plain proxy addition — not our edit-flexible flow.
  const batched = getBatchedTxs(inner);
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
