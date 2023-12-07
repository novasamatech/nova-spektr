import { createEndpoint } from '@remote-ui/rpc';
import { WsProvider } from '@polkadot/rpc-provider';
import { ApiPromise } from '@polkadot/api';
import isEqual from 'lodash/isEqual';

import { Account, AccountId, Chain, ChainId } from '@shared/core';
import { InitConnectionsResult } from '../common/consts';
import { ProxyAccount } from '../common/types';
import { isEqualProxies, toProxyAccount } from '../common/utils';

const state = {
  apis: {} as Record<ChainId, ApiPromise>,
};

function initConnection(chain: Chain) {
  return new Promise((resolve) => {
    if (!chain) {
      return;
    }

    try {
      // TODO: (current task) Provide connection to use light clients and single selected or custom nodes
      let provider = new WsProvider(chain.nodes.map((node) => node.url));

      if (!provider) {
        return;
      }

      provider.on('connected', async () => {
        const api = await ApiPromise.create({
          provider,
          throwOnConnect: true,
          throwOnUnknown: true,
        });

        state.apis[chain.chainId] = api;

        resolve(InitConnectionsResult.SUCCESS);

        return;
      });
    } catch (e) {
      console.log(e);
    }
  });
}

async function disconnect(chainId: ChainId) {
  const api = state.apis[chainId];

  if (!api) return;

  if (api.isConnected) {
    await api.disconnect();
  }
}

async function getProxies(chainId: ChainId, accounts: Record<AccountId, Account>, proxies: ProxyAccount[]) {
  const api = state.apis[chainId];
  const proxiesToAdd = [] as ProxyAccount[];
  const existedProxies = [] as ProxyAccount[];

  if (!api || !api.query.proxy) {
    return {
      proxiesToAdd: [],
      proxiesToRemove: [],
    };
  }

  try {
    const keys = await api.query.proxy.proxies.keys();

    await Promise.all(
      keys.map(async (key) => {
        try {
          const proxyData = (await api.rpc.state.queryStorageAt([key])) as any;

          const proxiedAccountId = key.args[0].toHex();
          const proxyAccountList = proxyData[0][0].toHuman().map(toProxyAccount);

          proxyAccountList.forEach((a: ProxyAccount) => {
            const newProxy = {
              proxiedAccountId: proxiedAccountId,
              ...a,
            };

            const linkedAccount = accounts[a.accountId] || accounts[proxiedAccountId];

            const alreadyExists = [...proxies].some((oldProxy) => isEqualProxies(oldProxy, newProxy));

            if (linkedAccount && !alreadyExists) {
              proxiesToAdd.push(newProxy);
            }

            if (linkedAccount) {
              existedProxies.push(newProxy);
            }
          });
        } catch (e) {
          console.log('proxy error', e);
        }
      }),
    );
  } catch (e) {
    console.log(e);
  }

  return {
    proxiesToAdd,
    proxiesToRemove: proxies.filter((p) => !existedProxies.some((ep) => isEqual(p, ep))),
  };
}

// @ts-ignore
const endpoint = createEndpoint(self);

endpoint.expose({ initConnection, getProxies, disconnect });
