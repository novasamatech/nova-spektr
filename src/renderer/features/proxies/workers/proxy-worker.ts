import { createEndpoint } from '@remote-ui/rpc';
import { ScProvider, WsProvider } from '@polkadot/rpc-provider';
import { ApiPromise } from '@polkadot/api';
import isEqual from 'lodash/isEqual';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import * as Sc from '@substrate/connect';

import {
  Account,
  AccountId,
  Chain,
  ChainId,
  Connection,
  ConnectionType,
  PartialProxyAccount,
  ProxyAccount,
} from '@shared/core';
import { InitConnectionsResult } from '../lib/consts';
import { proxyWorkerUtils } from '../lib/utils';

const state = {
  apis: {} as Record<ChainId, ApiPromise>,
};

function initConnection(chain: Chain, connection: Connection) {
  return new Promise((resolve) => {
    if (!chain) {
      return;
    }

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
  const proxiesToAdd = [] as PartialProxyAccount[];
  const existedProxies = [] as PartialProxyAccount[];

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
          const proxyAccountList = proxyData[0][0].toHuman().map(proxyWorkerUtils.toProxyAccount);

          proxyAccountList.forEach((a: PartialProxyAccount) => {
            const newProxy = {
              accountId: proxiedAccountId,
              chainId,
              ...a,
            };

            const hasProxyOrProxiedAccount = accounts[newProxy.accountId] || accounts[newProxy.proxyAccountId];
            const alreadyExists = [...proxies].some((oldProxy) =>
              proxyWorkerUtils.isSameProxies(oldProxy, newProxy as ProxyAccount),
            );

            if (hasProxyOrProxiedAccount && !alreadyExists) {
              proxiesToAdd.push(newProxy);
            }

            if (hasProxyOrProxiedAccount) {
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

function getConnectionStatus(chainId: ChainId): boolean {
  const api = state.apis[chainId];

  return Boolean(api?.isConnected);
}

// @ts-ignore
const endpoint = createEndpoint(self);

endpoint.expose({ initConnection, getProxies, getConnectionStatus, disconnect });

console.log('proxy worker started successfully');
