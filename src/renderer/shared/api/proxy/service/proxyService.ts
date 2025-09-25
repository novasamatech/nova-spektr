import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import { type ProxyType } from '@/shared/core';
import { proxyPallet } from '@/shared/pallet/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const proxyService = {
  getMaxProxies,
  getProxyDeposit,
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

function getProxyDeposit(api: ApiPromise, deposit: string, proxyNumber: number): string {
  const { proxyDepositFactor, proxyDepositBase } = api.consts.proxy;
  const proxyDeposit = proxyDepositFactor.muln(proxyNumber).add(proxyDepositBase);

  return proxyDeposit.sub(new BN(deposit)).toString();
}
