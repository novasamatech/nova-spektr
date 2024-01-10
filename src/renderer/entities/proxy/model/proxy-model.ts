import { createEffect, createEvent, createStore, sample } from 'effector';

import { proxyUtils } from '../lib/utils';
import type { ProxyAccount, AccountId } from '@shared/core';
import { storageService } from '@shared/api/storage';

type ProxyStore = Record<AccountId, ProxyAccount[]>;

const $proxies = createStore<ProxyStore>({});

const proxiesAdded = createEvent<ProxyAccount[]>();
const proxiesRemoved = createEvent<ProxyAccount[]>();

const populateProxiesFx = createEffect((): Promise<ProxyAccount[]> => {
  return storageService.proxies.readAll();
});

const addProxiesFx = createEffect((proxies: ProxyAccount[]): Promise<ProxyAccount[] | undefined> => {
  return storageService.proxies.createAll(proxies);
});

const removeProxiesFx = createEffect((proxies: ProxyAccount[]) => {
  return storageService.proxies.deleteAll(proxies.map((p) => p.id));
});

sample({
  clock: populateProxiesFx.doneData,
  fn: (proxies) => proxies.reduce<ProxyStore>((acc, p) => ({ ...acc, [p.accountId]: p }), {}),
  target: $proxies,
});

sample({
  clock: proxiesAdded,
  source: $proxies,
  fn: (proxies, proxiesToAdd) => {
    return proxiesToAdd.reduce<ProxyStore>(
      (acc, p) => ({ ...acc, [p.accountId]: [...(acc[p.accountId] || []), p] }),
      proxies,
    );
  },
  target: $proxies,
});

sample({ clock: proxiesAdded, target: addProxiesFx });

sample({
  clock: proxiesRemoved,
  source: $proxies,
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

export const proxyModel = {
  $proxies,
  events: {
    proxiesAdded,
    proxiesRemoved,
  },
};
