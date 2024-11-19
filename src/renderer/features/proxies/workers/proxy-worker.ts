import { ApiPromise } from '@polkadot/api';
import { ScProvider, WsProvider } from '@polkadot/rpc-provider';
import { type ProviderInterface } from '@polkadot/rpc-provider/types';
import { createEndpoint } from '@remote-ui/rpc';
import * as Sc from '@substrate/connect';

import {
  type AccountId,
  type BaseAccount,
  type Chain,
  type ChainId,
  type Connection,
  ConnectionType,
  type NoID,
  type PartialProxiedAccount,
  type ProxiedAccount,
  type ProxyAccount,
  type ProxyDeposits,
  type ProxyType,
  ProxyVariant,
} from '@/shared/core';
import { proxyPallet } from '@/shared/pallet/proxy';
import { proxyWorkerUtils } from '../lib/worker-utils';

export const proxyWorker = {
  initConnection,
  getProxies,
  disconnect,
};

export const state: { apis: Record<ChainId, ApiPromise> } = {
  apis: {},
};

const InitConnectionsResult = {
  SUCCESS: 'success',
  FAILED: 'failed',
};

function initConnection(chain?: Chain, connection?: Connection) {
  return new Promise((resolve, reject) => {
    if (!chain) {
      console.error('proxy-worker: chain not provided');
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
            provider = new ScProvider(Sc, knownChainId);
            provider.connect();
          }
        } catch (e) {
          console.error('proxy-worker: light client not connected', e);
          reject();

          return;
        }
      }

      if (!provider) {
        console.error('proxy-worker: provider not connected');
        reject();

        return;
      }

      provider.on('connected', async () => {
        state.apis[chain.chainId] = await ApiPromise.create({ provider, throwOnConnect: true, throwOnUnknown: true });

        resolve(InitConnectionsResult.SUCCESS);
      });
    } catch (e) {
      console.error('proxy-worker: error in initConnection', e);

      reject();
    }
  });
}

async function disconnect(chainId: ChainId) {
  if (!proxyWorkerUtils.isApiConnected(state.apis, chainId)) return;

  await state.apis[chainId].disconnect();
}

type GetProxiesParams = {
  chainId: ChainId;
  accountsForProxy: Record<AccountId, BaseAccount>;
  accountsForProxied: Record<AccountId, BaseAccount>;
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

  const existingProxies: NoID<ProxyAccount>[] = [];
  const proxiesToAdd: NoID<ProxyAccount>[] = [];

  const existingProxiedAccounts: PartialProxiedAccount[] = [];
  const proxiedAccountsToAdd: PartialProxiedAccount[] = [];

  const deposits: ProxyDeposits = {
    chainId: chainId,
    deposits: {},
  };

  if (!api || !api.query.proxy) {
    return { proxiesToAdd, proxiesToRemove: [], proxiedAccountsToAdd, proxiedAccountsToRemove: [], deposits };
  }

  try {
    const entries = await proxyPallet.storage.proxies(api);

    for (const { account, value } of entries) {
      try {
        if (value.accounts.length === 0) {
          continue;
        }

        for (const delegatedAccount of value.accounts) {
          const newProxy: NoID<ProxyAccount> = {
            chainId,
            proxiedAccountId: account,
            accountId: delegatedAccount.delegate,
            // TODO support all proxy types
            proxyType: delegatedAccount.proxyType as ProxyType,
            delay: delegatedAccount.delay,
          };

          const needToAddProxiedAccount =
            accountsForProxied[newProxy.accountId] && !proxyWorkerUtils.isDelayedProxy(newProxy);

          if (needToAddProxiedAccount) {
            const proxiedAccount: PartialProxiedAccount = {
              ...newProxy,
              proxyAccountId: newProxy.accountId,
              accountId: newProxy.proxiedAccountId,
              proxyVariant: ProxyVariant.NONE,
            };

            const doesProxiedAccountExist = proxiedAccounts.some((oldProxy) =>
              proxyWorkerUtils.isSameProxied(oldProxy, proxiedAccount),
            );

            if (!doesProxiedAccountExist) {
              proxiedAccountsToAdd.push(proxiedAccount);
            }

            existingProxiedAccounts.push(proxiedAccount);
          }

          if (needToAddProxiedAccount) {
            deposits.deposits[account] = value.deposit.toString();
          }
        }

        for (const delegatedAccount of value.accounts) {
          const newProxy: NoID<ProxyAccount> = {
            chainId,
            proxiedAccountId: account,
            accountId: delegatedAccount.delegate,
            // TODO support all proxy types
            proxyType: delegatedAccount.proxyType as ProxyType,
            delay: delegatedAccount.delay,
          };

          const needToAddProxyAccount =
            accountsForProxy[account] || proxiedAccountsToAdd.some((p) => p.accountId === account);
          const doesProxyExist = proxies.some((oldProxy) => proxyWorkerUtils.isSameProxy(oldProxy, newProxy));

          if (needToAddProxyAccount) {
            if (!doesProxyExist) {
              proxiesToAdd.push(newProxy);
            }

            existingProxies.push(newProxy);
          }

          if (needToAddProxyAccount) {
            deposits.deposits[account] = value.deposit.toString();
          }
        }
      } catch (e) {
        console.error(`proxy-worker ${api.genesisHash}: proxy error`, e);
      }
    }
  } catch (e) {
    console.error(`proxy-worker ${api.genesisHash}: error in getProxies`, e);
  }

  const proxiesToRemove = proxies.filter((p) => !existingProxies.some((ep) => proxyWorkerUtils.isSameProxy(p, ep)));

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

  return {
    proxiesToAdd,
    proxiesToRemove,
    proxiedAccountsToAdd,
    proxiedAccountsToRemove,
    deposits,
  };
}

// @ts-expect-error TODO fix
const endpoint = createEndpoint(self);

endpoint.expose({ initConnection, getProxies, disconnect });
