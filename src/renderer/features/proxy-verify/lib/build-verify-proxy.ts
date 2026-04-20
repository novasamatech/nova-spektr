import { type ChainId, type Transaction, TransactionType } from '@/shared/core';
import { type ProxyType, ProxyTypes } from '@/shared/core/types/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const VERIFIABLE_PROXY_TYPES: ReadonlySet<ProxyType> = new Set([ProxyTypes.ANY, ProxyTypes.NON_TRANSFER]);

/**
 * The emptiest possible `system.remark` extrinsic, used as the inner call of
 * the Verify-via-proxy transaction. Payload has no effect on detection (indexer
 * only inspects the outer `proxy.proxy` call) and no effect on the runtime
 * filter (System pallet membership is payload-agnostic). Empty bytes keep the
 * extrinsic at its minimum possible weight.
 */
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
  /**
   * The multisig proxy account (signer). The core tx is from the proxy's POV, so
   * we attach their accountId here — the multisig wrapper built later will
   * handle the asMulti envelope with signatory / other-signatories.
   */
  proxyAccountId: AccountId;
  pureProxyAccountId: AccountId;
  proxyType: ProxyType;
};

/**
 * Core transaction shape:
 *
 * Proxy.proxy(real = pureProxyAccountId, forceProxyType = proxyType, call =
 * system.remark('0x'))
 *
 * The outer `multisig.asMulti` wrap is produced by the shared
 * `createComplexTxStore` plumbing (same path used by every other multisig
 * flow). Do not wrap this result in `utility.batch*` or `asDerivative` — the
 * indexer's `extractProxiedAccountId` only accepts bare `proxy.proxy` or the
 * first element of `utility.batch*`.
 */
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
