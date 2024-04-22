import { createEndpoint } from '@remote-ui/rpc';
import { ScProvider, WsProvider } from '@polkadot/rpc-provider';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { ApiPromise } from '@polkadot/api';
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
  NoID,
  PartialProxiedAccount,
  ProxyVariant,
  ProxyDeposits,
} from '@shared/core';
import { proxyWorkerUtils } from '../lib/worker-utils';

export const proxyWorker = {
  initConnection,
  getProxies,
  disconnect,
};

export const state = {
  apis: {} as Record<ChainId, ApiPromise>,
};

const InitConnectionsResult = {
  SUCCESS: 'success',
  FAILED: 'failed',
};

function initConnection(chain?: Chain, connection?: Connection) {
  return new Promise((resolve, reject) => {
    if (!chain) {
      console.log('proxy-worker: chain not provided');
      reject();

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
            provider.connect();
          }
        } catch (e) {
          console.log('proxy-worker: light client not connected', e);
          reject();

          return;
        }
      }

      if (!provider) {
        console.log('proxy-worker: provider not connected');
        reject();

        return;
      }

      provider.on('connected', async () => {
        state.apis[chain.chainId] = await ApiPromise.create({ provider, throwOnConnect: true, throwOnUnknown: true });

        console.log('proxy-worker: provider connected successfully');
        resolve(InitConnectionsResult.SUCCESS);
      });
    } catch (e) {
      console.log('proxy-worker: error in initConnection', e);

      reject();
    }
  });
}

async function disconnect(chainId: ChainId) {
  if (!proxyWorkerUtils.isApiConnected(state.apis, chainId)) return;

  console.log('proxy-worker: disconnecting from chainId', chainId);
  await state.apis[chainId].disconnect();
}

type GetProxiesParams = {
  chainId: ChainId;
  accountsForProxy: Record<AccountId, Account>;
  accountsForProxied: Record<AccountId, Account>;
  proxiedAccounts: ProxiedAccount[];
  proxies: ProxyAccount[];
};
// TODO: Refactor this code
async function getProxies({
  chainId,
  accountsForProxy,
  accountsForProxied,
  proxiedAccounts,
  proxies,
}: GetProxiesParams) {
  const api = state.apis[chainId];

  const existingProxies = [] as NoID<ProxyAccount>[];
  const proxiesToAdd = [] as NoID<ProxyAccount>[];

  const existingProxiedAccounts = [] as PartialProxiedAccount[];
  const proxiedAccountsToAdd = [] as PartialProxiedAccount[];

  const deposits = {
    chainId: chainId,
    deposits: {},
  } as ProxyDeposits;

  if (!api || !api.query.proxy) {
    return { proxiesToAdd, proxiesToRemove: [], proxiedAccountsToAdd, proxiedAccountsToRemove: [], deposits };
  }

  try {
    const entries = await api.query.proxy.proxies.entries();
    entries.forEach(([key, value]) => {
      try {
        const proxyData = value.toHuman() as any;
        const proxiedAccountId = key.args[0].toHex();

        proxyData[0].forEach((account: any) => {
          const newProxy: NoID<ProxyAccount> = {
            chainId,
            proxiedAccountId,
            accountId: proxyWorkerUtils.toAccountId(account?.delegate),
            proxyType: account.proxyType,
            delay: Number(account.delay),
          };

          const needToAddProxiedAccount =
            accountsForProxied[newProxy.accountId] && !proxyWorkerUtils.isDelayedProxy(newProxy);

          if (needToAddProxiedAccount) {
            const proxiedAccount = {
              ...newProxy,
              proxyAccountId: newProxy.accountId,
              accountId: newProxy.proxiedAccountId,
              proxyVariant: ProxyVariant.NONE,
            } as PartialProxiedAccount;

            const doesProxiedAccountExist = proxiedAccounts.some((oldProxy) =>
              proxyWorkerUtils.isSameProxied(oldProxy, proxiedAccount),
            );

            console.log(`proxy-worker ${api.genesisHash}: found 🟣 proxied account: `, proxiedAccount);
            if (!doesProxiedAccountExist) {
              console.log(`proxy-worker ${api.genesisHash}: 🟣 proxied should be added: `, proxiedAccount);
              proxiedAccountsToAdd.push(proxiedAccount);
            }

            existingProxiedAccounts.push(proxiedAccount);
          }

          if (needToAddProxiedAccount) {
            deposits.deposits[proxiedAccountId] = proxyData[1];
          }
        });

        proxyData[0].forEach((account: any) => {
          const newProxy: NoID<ProxyAccount> = {
            chainId,
            proxiedAccountId,
            accountId: proxyWorkerUtils.toAccountId(account?.delegate),
            proxyType: account.proxyType,
            delay: Number(account.delay),
          };

          const needToAddProxyAccount =
            accountsForProxy[proxiedAccountId] || proxiedAccountsToAdd.some((p) => p.accountId === proxiedAccountId);
          const doesProxyExist = proxies.some((oldProxy) => proxyWorkerUtils.isSameProxy(oldProxy, newProxy));

          if (needToAddProxyAccount) {
            console.log(`proxy-worker ${api.genesisHash}: found 🔵 proxy : `, newProxy);
            if (!doesProxyExist) {
              console.log(`proxy-worker ${api.genesisHash}: 🔵 proxy  should be added: `, newProxy);
              proxiesToAdd.push(newProxy);
            }

            existingProxies.push(newProxy);
          }

          if (needToAddProxyAccount) {
            deposits.deposits[proxiedAccountId] = proxyData[1];
          }
        });
      } catch (e) {
        console.log(`proxy-worker ${api.genesisHash}: proxy error`, e);
      }
    });
  } catch (e) {
    console.log(`proxy-worker ${api.genesisHash}: error in getProxies`, e);
  }

  const proxiesToRemove = proxies.filter((p) => !existingProxies.some((ep) => proxyWorkerUtils.isSameProxy(p, ep)));
  console.log(`proxy-worker ${api.genesisHash}: 🔵 proxy accounts to remove: `, proxiesToRemove);

  const proxiedAccountsToRemove = Object.values(proxiedAccounts).filter((p) => {
    return !existingProxiedAccounts.some(
      (ep) =>
        ep.accountId === p.accountId &&
        ep.chainId === p.chainId &&
        ep.proxyAccountId === p.proxyAccountId &&
        ep.delay === p.delay &&
        ep.proxyType === p.proxyType,
    );
  });
  console.log(`proxy-worker ${api.genesisHash}: 🟣 proxied accounts to remove: `, proxiedAccountsToRemove);

  return {
    proxiesToAdd,
    proxiesToRemove,
    proxiedAccountsToAdd,
    proxiedAccountsToRemove,
    deposits,
  };
}

// @ts-ignore
const endpoint = createEndpoint(self);

endpoint.expose({ initConnection, getProxies, disconnect });

console.log(`proxy-worker: worker started successfully`);
