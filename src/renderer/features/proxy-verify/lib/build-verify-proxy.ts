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

export function isVerifiableProxyType(proxyType: ProxyType): boolean {
  return VERIFIABLE_PROXY_TYPES.has(proxyType);
}
