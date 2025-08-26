import { createEffect, createEvent, createStore, sample } from 'effector';
import { groupBy } from 'lodash';

import { storageService } from '@/shared/api/storage';
import { type ID, type NoID, type ProxyAccount } from '@/shared/core';
import { entries } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

type ProxyStore = Record<AccountId, ProxyAccount[]>;

const proxiesAdded = createEvent<NoID<ProxyAccount>[]>();
const proxiesRemoved = createEvent<ProxyAccount[]>();

const $proxies = createStore<ProxyStore>({});

const populateProxiesFx = createEffect((): Promise<ProxyAccount[]> => {
  return storageService.proxies.readAll();
});

const addProxiesFx = createEffect((proxies: NoID<ProxyAccount>[]): Promise<ProxyAccount[] | undefined> => {
  return storageService.proxies.createAll(proxies);
});

const removeProxiesFx = createEffect((proxies: ProxyAccount[]): Promise<ID[] | undefined> => {
  return storageService.proxies.deleteAll(proxies.map((p) => p.id));
});

const proxyStartFx = createEffect(async () => {
  await populateProxiesFx();
});

sample({
  clock: populateProxiesFx.doneData,
  fn: (proxies) => groupBy(proxies, 'proxiedAccountId'),
  target: $proxies,
});

sample({
  clock: proxiesAdded,
  filter: (proxiesToAdd) => proxiesToAdd.length > 0,
  target: addProxiesFx,
});

sample({
  clock: addProxiesFx.doneData,
  source: $proxies,
  filter: (_, proxiesToAdd) => Boolean(proxiesToAdd),
  fn: (proxies, proxiesToAdd) => {
    return proxiesToAdd!.reduce<ProxyStore>((acc, proxyAccount) => {
      if (acc[proxyAccount.proxiedAccountId]) {
        acc[proxyAccount.proxiedAccountId].push(proxyAccount);
      } else {
        acc[proxyAccount.proxiedAccountId] = [proxyAccount];
      }

      return acc;
    }, proxies);
  },
  target: $proxies,
});

sample({
  clock: proxiesRemoved,
  filter: (proxiesToRemove) => proxiesToRemove.length > 0,
  target: removeProxiesFx,
});

sample({
  clock: removeProxiesFx.doneData,
  source: $proxies,
  filter: (_, proxiesToRemove) => Boolean(proxiesToRemove),
  fn: (proxies, proxiesToRemove) => {
    return entries(proxies).reduce<ProxyStore>((acc, [accountId, proxyAccounts]) => {
      const filteredProxyAccounts = proxyAccounts.filter((proxyAccount) => !proxiesToRemove!.includes(proxyAccount.id));
      if (filteredProxyAccounts.length) {
        acc[accountId] = filteredProxyAccounts;
      }

      return acc;
    }, {});
  },
  target: $proxies,
});

export const proxyModel = {
  $proxies,

  populate: proxyStartFx,

  events: {
    proxiesAdded,
    proxiesRemoved,
  },
};
