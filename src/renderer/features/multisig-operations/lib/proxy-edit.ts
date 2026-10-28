import { type DecodedTransaction, type ProxyType, ProxyTypes } from '@/shared/core';
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

const isProxyCall = (tx: DecodedTransaction): boolean => tx.section === 'proxy' && tx.method === 'proxy';

// Plain `system.remark` only — the outer new-controller metadata wrap uses
// `system.remarkWithEvent`, and we deliberately don't conflate the two.
const isPlainRemark = (tx: DecodedTransaction): boolean => tx.section === 'system' && tx.method === 'remark';

const isRemarkWithEvent = (tx: DecodedTransaction): boolean =>
  tx.section === 'system' && tx.method === 'remarkWithEvent';

const isDecodedTransaction = (value: unknown): value is DecodedTransaction =>
  typeof value === 'object' && value !== null && 'section' in value && 'method' in value;

const getBatchCalls = (tx: DecodedTransaction): DecodedTransaction[] | null => {
  if (tx.section !== 'utility' || !BATCH_METHODS.has(tx.method)) return null;

  const calls = tx.args['transactions'];

  return Array.isArray(calls) && calls.every(isDecodedTransaction) ? calls : null;
};

// The edit batch is exactly what `change-signatories-model.ts` builds and nothing more:
// `[addProxy, removeProxy]` (trusted) or `[addProxy, marker system.remark]` (verified).
// A batch with any other call, order or count is not an edit — it is a plain batch.
const isEditFlexiblePair = (calls: DecodedTransaction[]): calls is [DecodedTransaction, DecodedTransaction] => {
  const [first, second] = calls;
  if (calls.length !== 2 || !first || !second) return false;

  return isAddProxy(first) && (isRemoveProxy(second) || isPlainRemark(second));
};

// Locate the inner batch that defines an edit-flexible op.
//
// The edit batch always runs through the flexible multisig's proxy:
// `proxy.proxy(real, call=batchAll([addProxy, removeProxy | marker]))`. When the
// new-controller multisig isn't known locally, the producer wraps that proxy.proxy
// in an outer batchAll with a `system.remarkWithEvent` carrying new-ctrl metadata
// in front of it (see `change-signatories-model.ts > $coreTx`). Only these two
// shapes are accepted; a bare batch without the proxy wrapper never is.
const findEditFlexibleBatch = (tx: DecodedTransaction | null): [DecodedTransaction, DecodedTransaction] | null => {
  if (nullable(tx)) return null;

  if (isProxyCall(tx)) {
    const inner = tx.args['transaction'];
    if (!isDecodedTransaction(inner)) return null;

    const calls = getBatchCalls(inner);

    return calls && isEditFlexiblePair(calls) ? calls : null;
  }

  const calls = getBatchCalls(tx);
  if (!calls) return null;

  const [metadata, proxied] = calls;
  if (calls.length !== 2 || !metadata || !proxied || !isRemarkWithEvent(metadata) || !isProxyCall(proxied)) {
    return null;
  }

  return findEditFlexibleBatch(proxied);
};

type ProxyArgs = { delegate: AccountId; proxyType: ProxyType };

const isProxyType = (value: unknown): value is ProxyType =>
  typeof value === 'string' && Object.values<string>(ProxyTypes).includes(value);

const extractProxyArgs = (tx: DecodedTransaction): ProxyArgs | null => {
  const delegate = tx.args['delegate'];
  const proxyType = tx.args['proxyType'];
  if (typeof delegate !== 'string' || !isProxyType(proxyType)) return null;
  return { delegate: toAccountId(delegate), proxyType };
};

const extractMarker = (tx: DecodedTransaction): EditControllerMarkerPayload | null => {
  if (!isPlainRemark(tx)) return null;

  const remark = tx.args['remark'];

  return typeof remark === 'string' ? parseEditControllerMarker(remark) : null;
};

export const parseProxyEditOperation = (operation: MultisigOperation): ProxyEditInfo | null => {
  // Bare `add_proxy` (no batch) is a plain proxy addition — not our edit-flexible flow,
  // so we deliberately require the proxy.proxy → batchAll structure (handled by
  // findEditFlexibleBatch).
  const batched = findEditFlexibleBatch(operation.transaction);
  if (!batched) return null;

  const [addTx, secondTx] = batched;
  const addArgs = extractProxyArgs(addTx);
  if (nullable(addArgs)) return null;

  if (isRemoveProxy(secondTx)) {
    const removeArgs = extractProxyArgs(secondTx);
    if (nullable(removeArgs)) return null;
    return {
      newControllerAccountId: addArgs.delegate,
      oldControllerAccountId: removeArgs.delegate,
      proxyType: addArgs.proxyType,
      isTrustedFlow: true,
    };
  }

  const marker = extractMarker(secondTx);
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
