import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import { type Address, type ProxyType } from '@shared/core';

export const proxyService = {
  getMaxProxies,
  getProxyDeposit,
  getProxiesForAccount,
};

function getMaxProxies(api: ApiPromise): number {
  return api.consts.proxy.maxProxies.toNumber();
}

type ProxyAccounts = {
  accounts: { address: Address; proxyType: ProxyType }[];
  deposit: string;
};
async function getProxiesForAccount(api: ApiPromise, account: Address): Promise<ProxyAccounts> {
  const proxies = await api.query.proxy.proxies(account);

  const accounts = proxies[0].map((value) => ({
    address: value.delegate.toHuman() as Address,
    proxyType: value.proxyType.toHuman() as ProxyType,
  }));

  return { accounts, deposit: proxies[1].toString() };
}

function getProxyDeposit(api: ApiPromise, deposit: string, proxyNumber: number): string {
  const { proxyDepositFactor, proxyDepositBase } = api.consts.proxy;
  const proxyDeposit = proxyDepositFactor.muln(proxyNumber).add(proxyDepositBase);

  return proxyDeposit.sub(new BN(deposit)).toString();
}
