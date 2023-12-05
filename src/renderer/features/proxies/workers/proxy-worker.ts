import { createEndpoint } from '@remote-ui/rpc';
import { WsProvider } from '@polkadot/rpc-provider';
import { ApiPromise } from '@polkadot/api';

import { Chain, ChainId } from '@shared/core';
import { InitConnectionsResult } from '../common/consts';

const state = {
  apis: {} as Record<ChainId, ApiPromise>,
};

function initConnection(chain: Chain) {
  return new Promise((resolve) => {
    if (!chain) {
      return;
    }

    try {
      // TODO: Add connection support to use light clients and single selected node
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

async function getProxies(chainId: ChainId) {
  const api = state.apis[chainId];
  const result = new Map();

  if (!api || !api.query.proxy) return result;

  try {
    const keys = await api.query.proxy.proxies.keys();

    await Promise.all(
      keys.map(async (keyOld) => {
        try {
          const proxyData = (await api.rpc.state.queryStorageAt([keyOld])) as any;

          const proxyAccountId = keyOld.args[0].toHex();
          const accounts = proxyData[0][0].toHuman();
          const deposit = proxyData[0][1].toNumber();

          result.set(proxyAccountId, {
            deposit,
            accounts,
          });
        } catch (e) {
          console.log('proxy error', e);
        }
      }),
    );
  } catch (e) {
    console.log(e);
  }

  return Array.from(result.entries());
}

// @ts-ignore
const endpoint = createEndpoint(self);

endpoint.expose({ initConnection, getProxies, disconnect });
