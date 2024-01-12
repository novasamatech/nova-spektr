import { createEndpoint } from '@remote-ui/rpc';
import { ScProvider, WsProvider } from '@polkadot/rpc-provider';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { ApiPromise } from '@polkadot/api';
import isEqual from 'lodash/isEqual';
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

export const proxyWorkerFunctions = {
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

function initConnection(chain: Chain, connection: Connection) {
  return new Promise((resolve, reject) => {
    if (!chain) {
      console.log('chain not provided');
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
          }
        } catch (e) {
          console.log('light client not connected', e);
          reject();

          return;
        }
      }

      if (!provider) {
        console.log('provider not connected');
        reject();

        return;
      }

      provider.on('connected', async () => {
        state.apis[chain.chainId] = await ApiPromise.create({ provider, throwOnConnect: true, throwOnUnknown: true });

        resolve(InitConnectionsResult.SUCCESS);
      });
    } catch (e) {
      console.log(e);

      reject();
    }
  });
}

async function disconnect(chainId: ChainId) {
  if (!proxyWorkerUtils.isApiConnected(state.apis, chainId)) return;

  await state.apis[chainId].disconnect();
}

// TODO: Refactor this code
async function getProxies(
  chainId: ChainId,
  accounts: Record<AccountId, Account>,
  proxiedAccounts: ProxiedAccount[],
  proxies: ProxyAccount[],
) {
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
    const keys = await api.query.proxy.proxies.keys();

    const proxiesRequests = keys.map(async (key) => {
      try {
        const proxyData = (await api.rpc.state.queryStorageAt([key])) as any;

        const proxiedAccountId = key.args[0].toHex();

        proxyData[0][0].toHuman().forEach((account: any) => {
          const newProxy: NoID<ProxyAccount> = {
            chainId,
            proxiedAccountId,
            accountId: proxyWorkerUtils.toAccountId(account?.delegate),
            proxyType: account.proxyType,
            delay: Number(account.delay),
          };

          const needToAddProxyAccount = accounts[proxiedAccountId];
          const doesProxyExist = proxies.some((oldProxy) => proxyWorkerUtils.isSameProxy(oldProxy, newProxy));

          if (needToAddProxyAccount) {
            if (!doesProxyExist) {
              proxiesToAdd.push(newProxy);
            }

            existingProxies.push(newProxy);
          }

          const needToAddProxiedAccount = accounts[newProxy.accountId];

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

            if (!doesProxiedAccountExist) {
              proxiedAccountsToAdd.push(proxiedAccount);
            }

            existingProxiedAccounts.push(proxiedAccount);
          }

          if (needToAddProxyAccount || needToAddProxiedAccount) {
            deposits.deposits[proxiedAccountId] = proxyData[0][1].toHuman();
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

  const proxiesToRemove = proxies.filter((p) => existingProxies.some((ep) => isEqual(p, ep)));
  const proxiedAccountsToRemove = Object.values(proxiedAccounts)
    .filter(proxyWorkerUtils.isProxiedAccount)
    .filter(
      (p) =>
        !existingProxiedAccounts.some(
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
    proxiedAccountsToAdd,
    proxiedAccountsToRemove,
    deposits,
  };
}

// @ts-ignore
const endpoint = createEndpoint(self);

endpoint.expose({ initConnection, getProxies, disconnect });

console.log('proxy worker started successfully');
