import { type ChainId, type Transaction, TransactionType } from '@/shared/core';
import { type ProxyType, ProxyTypes } from '@/shared/core/types/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const VERIFIABLE_PROXY_TYPES: ReadonlySet<ProxyType> = new Set([ProxyTypes.ANY, ProxyTypes.NON_TRANSFER]);

/**
 * Builds the proxy.proxy(real=pure, call=system.remark) core tx that the
 * _clicked delegate_ will dispatch. The outer asMulti wrap is added by
 * createComplexTxStore's wrapLegacy pipeline based on the delegate's type.
 */
export function buildVerifyProxyCall({
  chainId,
  delegateAccountId,
  pureProxyAccountId,
  proxyType,
}: {
  chainId: ChainId;
  delegateAccountId: AccountId;
  pureProxyAccountId: AccountId;
  proxyType: ProxyType;
}): Transaction {
  const remark: Transaction = {
    chainId,
    accountId: pureProxyAccountId,
    type: TransactionType.REMARK,
    args: { remark: '0x' },
  };

  return {
    chainId,
    accountId: delegateAccountId,
    type: TransactionType.PROXY,
    args: {
      real: pureProxyAccountId,
      forceProxyType: proxyType,
      transaction: remark,
    },
  };
}

export function isVerifiableProxyType(proxyType: ProxyType): boolean {
  return VERIFIABLE_PROXY_TYPES.has(proxyType);
}
