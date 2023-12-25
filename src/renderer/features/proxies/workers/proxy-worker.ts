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
  ProxyAccount,
  ProxiedAccount,
  Account,
  AccountId,
} from '@shared/core';
import { InitConnectionsResult } from '../lib/constants';
import { proxyWorkerUtils } from '../lib/utils';
import { ProxyVariant } from '@/src/renderer/shared/core/types/proxy';

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

type PartialProxiedAccount = Pick<
  ProxiedAccount,
  'chainId' | 'proxyAccountId' | 'accountId' | 'delay' | 'proxyType' | 'proxyVariant'
>;

async function getProxies(chainId: ChainId, accounts: Record<AccountId, Account>, proxies: ProxyAccount[]) {
  const api = state.apis[chainId];
  if (!api || !api.query.proxy) {
    return { proxiesToAdd: [], proxiesToRemove: [] };
  }

  const existingProxies = [] as ProxyAccount[];
  const proxiesToAdd = [] as ProxyAccount[];

  const existingProxides = [] as PartialProxiedAccount[];
  const proxidesToAdd = [] as PartialProxiedAccount[];

  const deposits = {} as Record<AccountId, Record<ChainId, string>>;

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
            accountId: proxyWorkerUtils.toAccountId(account?.delegate),
            proxyType: account.proxyType,
            delay: Number(account.delay),
          };

          const needToAddProxyAccount = accounts[proxiedAccountId];

          // if equals then skip
          // if proxied is same
          const doesProxyExist = proxies.some((oldProxy) => proxyWorkerUtils.isSameProxies(oldProxy, newProxy));

          if (needToAddProxyAccount) {
            if (!doesProxyExist) {
              proxiesToAdd.push(newProxy);
            }

            deposits[proxiedAccountId] = {
              ...deposits[proxiedAccountId],
              [chainId]: proxyData[0][1].toHuman(),
            };

            existingProxies.push(newProxy);
          }

          const needToAddProxiedAccount = accounts[newProxy.accountId];

          if (needToAddProxiedAccount) {
            const proxiedAccount = {
              ...newProxy,
              proxyAccountId: newProxy.accountId,
              accountId: newProxy.proxiedAccountId,
              proxyVariant: ProxyVariant.REGULAR,
            } as PartialProxiedAccount;

            if (!doesProxyExist) {
              proxidesToAdd.push(proxiedAccount);
            }

            deposits[proxiedAccountId] = {
              ...deposits[proxiedAccountId],
              [chainId]: proxyData[0][1].toHuman(),
            };

            existingProxides.push(proxiedAccount);
          }

          // const doesProxyExist = proxies.some((oldProxy) => proxyWorkerUtils.isSameProxies(oldProxy, newProxy));
        });
      } catch (e) {
        console.log('proxy error', e);
      }
    });

    await Promise.all(proxiesRequests);
  } catch (e) {
    console.log(e);
  }

  const proxiesToRemove = proxies.filter((p) => !existingProxies.some((ep) => isEqual(p, ep)));
  const proxidesToRemove = Object.values(accounts)
    .filter(proxyWorkerUtils.isProxiedAccount)
    .filter(
      (p) =>
        !existingProxides.some(
          (ep) =>
            ep.accountId === p.accountId &&
            ep.chainId === p.chainId &&
            ep.proxyAccountId === p.proxyAccountId &&
            ep.proxyVariant === p.proxyVariant &&
            ep.delay === p.delay &&
            ep.proxyType === p.proxyType,
        ),
    );

  return {
    proxiesToAdd,
    proxiesToRemove,
    proxidesToAdd,
    proxidesToRemove,
    deposits,
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
