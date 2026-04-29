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

function proxyDepositRequired(api: ApiPromise, numProxies: number): BN {
  const proxyCount = Math.max(0, Math.floor(Number(numProxies)));

  if (proxyCount === 0) {
    return new BN(0);
  }

  const { proxyDepositFactor, proxyDepositBase } = api.consts.proxy;

  return new BN(proxyDepositFactor.toString()).muln(proxyCount).add(new BN(proxyDepositBase.toString()));
}

function getProxyDepositDelta(api: ApiPromise, existingDeposit: string, newProxyCount: number) {
  const required = proxyDepositRequired(api, newProxyCount);
  const existing = new BN(existingDeposit || '0', 10);
  const delta = required.sub(existing);

  return delta.isNeg() ? new BN(0) : delta;
}

/**
 * Calculate pure proxy deposit, that will be locked on spawner
 */
function getPureProxyDeposit(api: ApiPromise) {
  return proxyDepositRequired(api, 1);
}
