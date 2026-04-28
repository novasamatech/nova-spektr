import { type DecodedTransaction, type ProxyType } from '@/shared/core';
import { nullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
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

export const parseProxyEditOperation = (operation: MultisigOperation): ProxyEditInfo | null => {
  const inner = unwrapProxy(operation.transaction);
  if (nullable(inner)) return null;

  if (isAddProxy(inner)) {
    const args = extractProxyArgs(inner);
    if (nullable(args)) return null;
    return {
      newControllerAccountId: args.delegate,
      oldControllerAccountId: operation.multisigAccountId,
      proxyType: args.proxyType,
      isTrustedFlow: false,
    };
  }

  const batched = getBatchedTxs(inner);
  if (batched && batched.length === 2) {
    const addTx = batched.find(isAddProxy);
    const removeTx = batched.find(isRemoveProxy);
    if (addTx && removeTx) {
      const addArgs = extractProxyArgs(addTx);
      const removeArgs = extractProxyArgs(removeTx);
      if (nullable(addArgs) || nullable(removeArgs)) return null;
      return {
        newControllerAccountId: addArgs.delegate,
        oldControllerAccountId: removeArgs.delegate,
        proxyType: addArgs.proxyType,
        isTrustedFlow: true,
      };
    }
  }

  return null;
};

export const isProxyEditOperation = (operation: MultisigOperation): boolean =>
  parseProxyEditOperation(operation) !== null;
