import { type Chain, ChainOptions } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

export const proxiesUtils = {
  isRegularProxy,
  isPureProxy,
  chainSupportProxy,
  isProxiedAvailable,
};

function isRegularProxy(chain: Chain): boolean {
  return Boolean(chain.options?.includes(ChainOptions.REGULAR_PROXY));
}

function isPureProxy(chain: Chain): boolean {
  return Boolean(chain.options?.includes(ChainOptions.PURE_PROXY));
}

function chainSupportProxy(chain: Chain): boolean {
  return isRegularProxy(chain) || isPureProxy(chain);
}

function isProxiedAvailable(account: AnyAccount): boolean {
  return !accountUtils.isWatchOnlyAccount(account);
}
