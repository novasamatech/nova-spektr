import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import groupBy from 'lodash/groupBy';

import { proxyUtils } from '../lib/utils';
import { type ProxyAccount, AccountId, ProxyChainGroup, NoID } from '@shared/core';
import { storageService } from '@shared/api/storage';

type ProxyStore = Record<AccountId, ProxyAccount[]>;

const $proxies = createStore<ProxyStore>({});
const $proxyChainGroups = createStore<ProxyChainGroup[]>([]);

const $proxyChainGroupStore = combine($proxyChainGroups, (groups) => {
  return groupBy(groups, 'walletId');
});

const proxyStarted = createEvent();
const proxiesAdded = createEvent<ProxyAccount[]>();
const proxiesRemoved = createEvent<ProxyAccount[]>();

const proxyGroupsAdded = createEvent<NoID<ProxyChainGroup>[]>();
const proxyGroupsUpdated = createEvent<NoID<ProxyChainGroup>[]>();
const proxyGroupsRemoved = createEvent<ProxyChainGroup[]>();

const populateProxiesFx = createEffect((): Promise<ProxyAccount[]> => {
  return storageService.proxies.readAll();
});

const addProxiesFx = createEffect((proxies: ProxyAccount[]): Promise<ProxyAccount[] | undefined> => {
  return storageService.proxies.createAll(proxies);
});

const removeProxiesFx = createEffect((proxies: ProxyAccount[]) => {
  return storageService.proxies.deleteAll(proxies.map((p) => p.id));
});

const populateProxyGroupsFx = createEffect((): Promise<ProxyChainGroup[]> => {
  return storageService.proxyGroups.readAll();
});

const addProxyGroupsFx = createEffect(
  (proxyGroups: NoID<ProxyChainGroup>[]): Promise<ProxyChainGroup[] | undefined> => {
    return storageService.proxyGroups.createAll(proxyGroups);
  },
);

const updateProxyGroupsFx = createEffect((proxyGroups: ProxyChainGroup[]) => {
  return storageService.proxyGroups.updateAll(proxyGroups);
});

const removeProxyGroupsFx = createEffect((proxyGroups: ProxyChainGroup[]) => {
  return storageService.proxyGroups.deleteAll(proxyGroups.map((p) => p.id));
});

sample({
  clock: proxyStarted,
  target: [populateProxiesFx, populateProxyGroupsFx],
});

sample({
  clock: populateProxiesFx.doneData,
  fn: (proxies) => proxies.reduce<ProxyStore>((acc, p) => ({ ...acc, [p.accountId]: p }), {}),
  target: $proxies,
});

sample({
  clock: populateProxyGroupsFx.doneData,
  target: $proxyChainGroups,
});

sample({
  clock: proxiesAdded,
  source: $proxies,
  filter: (_, proxiesToAdd) => proxiesToAdd.length > 0,
  fn: (proxies, proxiesToAdd) => {
    return proxiesToAdd.reduce<ProxyStore>(
      (acc, p) => ({ ...acc, [p.proxiedAccountId]: [...(acc[p.proxiedAccountId] || []), p] }),
      proxies,
    );
  },
  target: $proxies,
});

sample({ clock: proxiesAdded, target: addProxiesFx });

sample({
  clock: proxiesRemoved,
  source: $proxies,
  filter: (_, proxiesToRemove) => proxiesToRemove.length > 0,
  fn: (proxies, proxiesToRemove) => {
    return proxiesToRemove.reduce<ProxyStore>((acc, proxyAccount) => {
      acc[proxyAccount.accountId] = acc[proxyAccount.accountId].filter(
        (account) => !proxyUtils.isSameProxy(account, proxyAccount),
      );

      return acc;
    }, proxies);
  },
  target: $proxies, // TODO: update $proxies after effect
});

sample({ clock: proxiesRemoved, target: removeProxiesFx });

sample({
  clock: proxyGroupsAdded,
  target: addProxyGroupsFx,
});

sample({
  clock: addProxyGroupsFx.doneData,
  source: $proxyChainGroups,
  filter: (_, newProxyGroups) => Boolean(newProxyGroups) || newProxyGroups!.length > 0,
  fn: (groups, newProxyGroups) => {
    return groups.concat(newProxyGroups!);
  },
  target: $proxyChainGroups,
});

sample({
  clock: proxyGroupsUpdated,
  source: $proxyChainGroups,
  filter: (_, proxyGroups) => Boolean(proxyGroups),
  fn: (groups, proxyGroups) => {
    return proxyGroups.reduce<ProxyChainGroup[]>((acc, g) => {
      const group = groups.find((p) => proxyUtils.isSameProxyChainGroup(p, g));
      if (group) {
        acc.push(group);
      }

      return acc;
    }, []);
  },
  target: updateProxyGroupsFx,
});

sample({
  clock: updateProxyGroupsFx.done,
  source: $proxyChainGroups,
  filter: (_, { params: proxyGroups }) => Boolean(proxyGroups),
  fn: (groups, { params: proxyGroups }) => {
    return groups.filter((g) => !proxyGroups!.some((p) => proxyUtils.isSameProxyChainGroup(g, p))).concat(proxyGroups);
  },
  target: $proxyChainGroups,
});

sample({
  clock: proxyGroupsRemoved,
  target: removeProxyGroupsFx,
});

sample({
  clock: removeProxyGroupsFx.doneData,
  source: $proxyChainGroups,
  filter: (_, proxyGroups) => Boolean(proxyGroups),
  fn: (groups, proxyGroups) => {
    return groups.filter((g) => !proxyGroups!.includes(g.id));
  },
  target: $proxyChainGroups,
});

export const proxyModel = {
  $proxies,
  $proxyChainGroups,
  $proxyChainGroupStore,
  events: {
    proxyStarted,
    proxiesAdded,
    proxiesRemoved,

    proxyGroupsAdded,
    proxyGroupsUpdated,
    proxyGroupsRemoved,
  },
};
