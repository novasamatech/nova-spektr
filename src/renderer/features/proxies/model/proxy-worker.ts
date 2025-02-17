import { ApiPromise } from '@polkadot/api';
import { ScProvider, WsProvider } from '@polkadot/rpc-provider';
import { type ProviderInterface } from '@polkadot/rpc-provider/types';
import { createEndpoint } from '@remote-ui/rpc';
import * as Sc from '@substrate/connect';

import {
  type Chain,
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
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { proxyWorkerUtils } from '../lib/worker-utils';

async function connect(chain: Chain, connection: Connection): Promise<ApiPromise | null> {
  let provider: ProviderInterface | undefined;

  if (!connection || connection.connectionType === ConnectionType.AUTO_BALANCE) {
    provider = new WsProvider(chain.nodes.concat(connection?.customNodes || []).map((node) => node.url));
  } else if (connection.connectionType === ConnectionType.RPC_NODE) {
    provider = new WsProvider([connection.activeNode?.url || '']);
  } else if (connection.connectionType === ConnectionType.LIGHT_CLIENT) {
    const knownChainId = proxyWorkerUtils.getKnownChain(chain.chainId);

    if (knownChainId) {
      provider = new ScProvider(Sc, knownChainId);
      provider.connect();
    }
  }

  if (!provider) return null;

  return ApiPromise.create({ provider, throwOnConnect: true, throwOnUnknown: true });
}

function disconnect(api: ApiPromise) {
  return api.disconnect();
}

export type GetProxiesParams = {
  chain: Chain;
  connection: Connection;
  accountsForProxy: Record<AccountId, AnyAccount>;
  accountsForProxied: Record<AccountId, AnyAccount>;
  proxiedAccounts: ProxiedAccount[];
  proxies: ProxyAccount[];
};
// TODO: Refactor this code
async function getProxies({
  chain,
  connection,
  accountsForProxy,
  accountsForProxied,
  proxiedAccounts,
  proxies,
}: GetProxiesParams) {
  const api = await connect(chain, connection);

  const existingProxies: NoID<ProxyAccount>[] = [];
  const proxiesToAdd: NoID<ProxyAccount>[] = [];

  const existingProxiedAccounts: PartialProxiedAccount[] = [];
  const proxiedAccountsToAdd: PartialProxiedAccount[] = [];

  const deposits: ProxyDeposits = {
    chainId: chain.chainId,
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
            chainId: chain.chainId,
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
            chainId: chain.chainId,
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

  disconnect(api);

  return {
    proxiesToAdd,
    proxiesToRemove,
    proxiedAccountsToAdd,
    proxiedAccountsToRemove,
    deposits,
  };
}

export const proxyWorker = {
  getProxies,
};

// @ts-expect-error TODO fix
const endpoint = createEndpoint(self);

endpoint.expose({ getProxies });
