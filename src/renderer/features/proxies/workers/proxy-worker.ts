import { createEndpoint } from '@remote-ui/rpc';
import { ScProvider, WsProvider } from '@polkadot/rpc-provider';
import { ApiPromise } from '@polkadot/api';
import isEqual from 'lodash/isEqual';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import * as Sc from '@substrate/connect';

import {
  Chain,
  ChainId,
  Connection,
  ConnectionType,
  PartialProxyAccount,
  ProxyAccount,
  ChainType,
  ProxiedAccount,
  Account,
  AccountId,
} from '@shared/core';
import { InitConnectionsResult } from '../lib/constants';
import { proxyWorkerUtils, toAccountId } from '../lib/utils';

const state = {
  apis: {} as Record<ChainId, ApiPromise>,
};

function initConnection(chain: Chain, connection: Connection) {
  return new Promise((resolve) => {
    if (!chain) return;

    try {
      let provider: ProviderInterface | undefined;

      if (!connection || connection.connectionType === ConnectionType.AUTO_BALANCE) {
        provider = new WsProvider(chain.nodes.concat(connection?.customNodes || []).map((node) => node.url));
      } else if (connection.connectionType === ConnectionType.RPC_NODE) {
        provider = new WsProvider([connection.activeNode?.url || '']);
      } else if (connection.connectionType === ConnectionType.LIGHT_CLIENT) {
        try {
          const knownChainId = proxyWorkerUtils.getKnownChain(chain.chainId);

          if (knownChainId) {
            // @ts-ignore
            provider = new ScProvider(Sc, knownChainId);
          }
        } catch (e) {
          console.log('light client not connected', e);
        }
      }

      if (!provider) return;

      provider.on('connected', async () => {
        state.apis[chain.chainId] = await ApiPromise.create({ provider, throwOnConnect: true, throwOnUnknown: true });

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
  if (!api || !api.query.proxy) {
    return { proxiesToAdd: [], proxiesToRemove: [] };
  }

  // const existingProxies = [] as ProxyAccount[];
  const proxiesToAdd = [] as ProxyAccount[];
  const proxidesToAdd = [] as ProxiedAccount[];
  const proxiesToRemove = [] as ProxiedAccount[];
  const proxidesToRemove = [] as ProxiedAccount[];

  try {
    const keys = await api.query.proxy.proxies.keys();

    const proxiesRequests = keys.map(async (key) => {
      try {
        const proxyData = (await api.rpc.state.queryStorageAt([key])) as any;

        const proxiedAccountId = key.args[0].toHex();
        // const doesProxiedExist = proxieds.some((oldProxied) => oldProxied.accountId === proxiedAccountId);
        // if (!doesProxiedExist) {
        //   proxidesToRemove.push();
        // }

        proxyData[0][0].toHuman().forEach((account: any) => {
          const newProxy: ProxyAccount = {
            chainId,
            proxiedAccountId,
            accountId: toAccountId(account?.delegate),
            proxyType: account.proxyType,
            delay: Number(account.delay),
          };

          const hasProxyOrProxiedAccount = accounts[newProxy.accountId] || accounts[proxiedAccountId];



          // if equals then skip
          // if proxied is same
          const doesProxyExist = proxies.some((oldProxy) => proxyWorkerUtils.isSameProxies(oldProxy, newProxy));

          if (!doesProxyExist) {

          }
          proxiesToAdd.push(newProxy);





          proxidesToAdd.push();
          proxiesToRemove.push();
          proxidesToRemove.push();



          // const doesProxyExist = proxies.some((oldProxy) => proxyWorkerUtils.isSameProxies(oldProxy, newProxy));

          if (accounts[newProxy.accountId]) {
            // for proxy accs
            const alreadyExists = [...proxies].some((oldProxy) => proxyWorkerUtils.isSameProxies(oldProxy, newProxy));
            if (hasProxyOrProxiedAccount && !alreadyExists) {
              proxiesToAdd.push(newProxy);
            }

            if (hasProxyOrProxiedAccount) {
              existingProxies.push(newProxy);
            }
          } else if (accounts[newProxy.proxiedAccountId]) {
            // for proxied
          }

        });
      } catch (e) {
        console.log('proxy error', e);
      }
    });

    await Promise.all(proxiesRequests);
  } catch (e) {
    console.log(e);
  }

  return {
    proxiesToAdd,
    proxiesToRemove,
    // proxiesToRemove: proxies.filter((p) => !existingProxies.some((ep) => isEqual(p, ep))),
    proxidesToAdd,
    proxidesToRemove,
  };
}

function getConnectionStatus(chainId: ChainId): boolean {
  const api = state.apis[chainId];

  return Boolean(api?.isConnected);
}

// @ts-ignore
const endpoint = createEndpoint(self);

endpoint.expose({ initConnection, getProxies, getConnectionStatus, disconnect });

console.log('proxy worker started successfully');
