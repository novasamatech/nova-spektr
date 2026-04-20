import { type ChainId, type Transaction, TransactionType } from '@/shared/core';
import { type ProxyType, ProxyTypes } from '@/shared/core/types/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const VERIFIABLE_PROXY_TYPES: ReadonlySet<ProxyType> = new Set([ProxyTypes.ANY, ProxyTypes.NON_TRANSFER]);

export function buildVerifyRemark({ chainId, accountId }: { chainId: ChainId; accountId: AccountId }): Transaction {
  return {
    chainId,
    accountId,
    type: TransactionType.REMARK,
    args: {
      remark: '0x',
    },
  };
}

type BuildVerifyProxyCoreParams = {
  chainId: ChainId;
  proxyAccountId: AccountId;
  pureProxyAccountId: AccountId;
  proxyType: ProxyType;
};

export function buildVerifyProxyCore({
  chainId,
  proxyAccountId,
  pureProxyAccountId,
  proxyType,
}: BuildVerifyProxyCoreParams): Transaction {
  const innerRemark = buildVerifyRemark({ chainId, accountId: proxyAccountId });

  return {
    chainId,
    accountId: proxyAccountId,
    type: TransactionType.PROXY,
    args: {
      real: pureProxyAccountId,
      forceProxyType: proxyType,
      transaction: innerRemark,
    },
  };
}

export function isVerifiableProxyType(proxyType: ProxyType): boolean {
  return VERIFIABLE_PROXY_TYPES.has(proxyType);
}
