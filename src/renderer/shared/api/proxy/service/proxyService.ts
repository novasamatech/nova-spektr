import { ApiPromise } from '@polkadot/api';

import { Address, ProxyType } from '@shared/core';

export const proxyService = {
  getMaxProxies,
  getProxyDeposit,
  getProxiesForAccount,
};

function getMaxProxies(api: ApiPromise): number {
  return api.consts.proxy.maxProxies.toNumber();
}

async function getProxiesForAccount(
  api: ApiPromise,
  account: Address,
): Promise<{ address: Address; proxyType: ProxyType }[]> {
  const accounts = await api.query.proxy.proxies(account);

  return accounts[0].map((value) => ({
    address: value.delegate.toHuman() as Address,
    proxyType: value.proxyType.toHuman() as ProxyType,
  }));
}

function getProxyDeposit(api: ApiPromise): string {
  const { proxyDepositFactor, proxyDepositBase } = api.consts.proxy;
  const deposit = proxyDepositFactor.add(proxyDepositBase);

  return deposit.toString();
}
