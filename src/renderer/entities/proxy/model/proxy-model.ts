import { createEffect, createEvent, createStore, sample } from 'effector';

import { proxyStorage } from '@shared/api/storage';
import { ProxyStore } from '../common/constants';
import { ProxyAccount } from '@shared/core';
import { proxyUtils } from '../common/utils';

const $proxies = createStore<ProxyStore>({});

const proxiesAdded = createEvent<ProxyAccount[]>();
const proxiesRemoved = createEvent<ProxyAccount[]>();

const populateProxiesFx = createEffect(() => {
  return proxyStorage.readAll();
});

const insertProxiesFx = createEffect((proxies: ProxyAccount[]) => {
  return proxyStorage.createAll(proxies);
});

const removeProxiesFx = createEffect((proxies: ProxyAccount[]) => {
  return proxyStorage.deleteAll(proxies);
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

sample({
  clock: proxiesAdded,
  target: insertProxiesFx,
});

sample({
  clock: proxiesRemoved,
  source: $proxies,
  fn: (proxies, proxiesToRemove) => {
    return proxiesToRemove.reduce<ProxyStore>(
      (acc, p) => ({ ...acc, [p.accountId]: acc[p.accountId].filter((pr) => !proxyUtils.isSameProxies(pr, p)) }),
      proxies,
    );
  },
  target: $proxies,
});

sample({
  clock: proxiesRemoved,
  target: removeProxiesFx,
});

export const proxyModel = {
  $proxies,
  events: {
    proxiesAdded,
    proxiesRemoved,
  },
};
