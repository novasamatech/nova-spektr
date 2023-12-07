import { createEndpoint } from '@remote-ui/rpc';
import { ScProvider, WsProvider } from '@polkadot/rpc-provider';
import { ApiPromise } from '@polkadot/api';
import isEqual from 'lodash/isEqual';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import * as Sc from '@substrate/connect';

import { Account, AccountId, Chain, ChainId, Connection, ConnectionType } from '@shared/core';
import { InitConnectionsResult } from '../common/consts';
import { ProxyAccount } from '../common/types';
import { proxieWorkerUtils } from '../common/utils';

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
          const knownChainId = proxieWorkerUtils.getKnownChain(chain.chainId);

          if (knownChainId) {
            provider = new ScProvider(Sc, knownChainId);
          }
        } catch (e) {
          console.log('light client not connected', e);
        }
      }

      console.log('xcm', provider);

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
          const proxyAccountList = proxyData[0][0].toHuman().map(proxieWorkerUtils.toProxyAccount);

          proxyAccountList.forEach((a: ProxyAccount) => {
            const newProxy = {
              proxiedAccountId: proxiedAccountId,
              ...a,
            };

            const linkedAccount = accounts[a.accountId] || accounts[proxiedAccountId];

            const alreadyExists = [...proxies].some((oldProxy) => proxieWorkerUtils.isEqualProxies(oldProxy, newProxy));

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
