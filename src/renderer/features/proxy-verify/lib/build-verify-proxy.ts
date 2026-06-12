import { type ChainId, type Transaction, TransactionType } from '@/shared/core';
import { type ProxyType, ProxyTypes } from '@/shared/core/types/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { buildVerifyProxyRemarkTx } from '@/shared/transactions';

export const VERIFIABLE_PROXY_TYPES: ReadonlySet<ProxyType> = new Set([ProxyTypes.ANY, ProxyTypes.NON_TRANSFER]);

/**
 * Builds the proxy.proxy(real=pure, call=system.remarkWithEvent(<marker>)) core
 * tx that the _clicked delegate_ will dispatch. The remark payload encodes the
 * (delegate, pure) pair so the executed op can be matched back to the row on
 * the consumer side. The outer asMulti wrap is added by createComplexTxStore's
 * wrapLegacy pipeline based on the delegate's type.
 */
export function buildVerifyProxyCall({
  chainId,
  delegateAccountId,
  pureProxyAccountId,
  proxyType,
  remark,
}: {
  chainId: ChainId;
  delegateAccountId: AccountId;
  pureProxyAccountId: AccountId;
  proxyType: ProxyType;
  remark?: string;
}): Transaction {
  const remarkTx = buildVerifyProxyRemarkTx({
    chainId,
    accountId: pureProxyAccountId,
    delegateAccountId,
    pureProxyAccountId,
    remark,
  });

  return {
    chainId,
    accountId: delegateAccountId,
    type: TransactionType.PROXY,
    args: {
      real: pureProxyAccountId,
      forceProxyType: proxyType,
      transaction: remarkTx,
    },
  };
}

export function isVerifiableProxyType(proxyType: ProxyType): boolean {
  return VERIFIABLE_PROXY_TYPES.has(proxyType);
}
