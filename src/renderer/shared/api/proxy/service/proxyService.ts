import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import { type ProxyType } from '@/shared/core';
import { proxyPallet } from '@/shared/pallet/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const proxyService = {
  getMaxProxies,
  getProxyDepositDelta,
  getPureProxyDeposit,
  getProxiesForAccount,
};

function getMaxProxies(api: ApiPromise): number {
  return api.consts.proxy.maxProxies.toNumber();
}

type ProxyAccounts = {
  accounts: { accountId: AccountId; proxyType: ProxyType }[];
  deposit: string;
};
async function getProxiesForAccount(api: ApiPromise, account: AccountId): Promise<ProxyAccounts> {
  const proxies = await proxyPallet.storage.proxies(api, [account]);
  const firstRecord = proxies.at(0)?.value;

  if (!firstRecord) {
    return {
      accounts: [],
      deposit: '0',
    };
  }

  const accounts = firstRecord.proxies.map((value) => ({
    accountId: value.delegate,
    proxyType: value.proxyType as ProxyType,
  }));

  return { accounts, deposit: firstRecord.deposit.toString() };
}

/**
 * Calculate deposit delta for new proxy connection based on existing proxied
 */
function getProxyDepositDelta(api: ApiPromise, existingDeposit: string, proxyNumber: number) {
  const { proxyDepositFactor, proxyDepositBase } = api.consts.proxy;
  const proxyDeposit = proxyDepositFactor.muln(proxyNumber).add(proxyDepositBase);

  return proxyDeposit.sub(new BN(existingDeposit));
}

/**
 * Calculate pure proxy deposit, that will be locked on spawner
 */
function getPureProxyDeposit(api: ApiPromise) {
  const { proxyDepositFactor, proxyDepositBase } = api.consts.proxy;
  return proxyDepositFactor.add(proxyDepositBase);
}
