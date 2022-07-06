import { useEffect, useState } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import type { ProviderInterface } from '@polkadot/rpc-provider/types';
import { ScProvider } from '@polkadot/rpc-provider/substrate-connect';

import statemine from './statemine.json';
import westmint from './westmint.json';

type HexString = `0x${string}`;
type ChainMap = Record<HexString, any>;
type ConnectionMap = Record<HexString, any>;

export const enum ActiveType {
  DISABLED = 'disabled',
  LOCAL_NODE = 'localNode',
  EXTERNAL_NODE = 'externalNode',
}

const KnownChainSpecs: Record<string, string> = {
  Statemine: JSON.stringify(statemine),
  Westmint: JSON.stringify(westmint),
};

const KnownChains: Record<string, string> = {
  Kusama: 'ksmcc3',
  Polkadot: 'polkadot',
  Westend: 'westend2',
};

export function getKnownChainId(chainId: string): string | undefined {
  return KnownChains[chainId];
}

export function getChainSpec(name: string): string {
  return KnownChainSpecs[name] || '';
}

const CONFIG_API = 'https://raw.githubusercontent.com/nova-wallet/nova-utils/master/chains/v3/chains_dev.json';

export const createConnection = async (network: any): Promise<ApiPromise | undefined> => {
  let provider: ProviderInterface | undefined;

  if (network.activeType === ActiveType.LOCAL_NODE) {
    const chainId = getKnownChainId(network.name);

    if (chainId) {
      provider = new ScProvider(chainId);
      await provider.connect();
    } else {
      const chainSpec = getChainSpec(network.chainId);
      if (chainSpec) {
        provider = new ScProvider(chainSpec);
        await provider.connect();
      }
    }
  } else if (network.activeType === ActiveType.EXTERNAL_NODE) {
    // TODO: Add possibility to select best node
    provider = new WsProvider(network.nodes[0].url);
  }

  if (!provider) return;

  return ApiPromise.create({ provider });
};

async function getChains(): Promise<any[]> {
  const chains = await fetch(CONFIG_API);

  return chains.json();
}

// @ts-ignore
function getNetworkMap(networks: any[]): ChainMap {
  return networks.reduce((acc, network) => {
    acc[network.chainId] = network;

    return acc;
  }, {} as ChainMap);
}

// @ts-ignore
function getConnectionMap(connections: (any | undefined)[]): ConnectionMap | undefined {
  if (!connections.length) return undefined;

  return connections.reduce(
    (acc, connection) => (connection ? { ...acc, [connection.network.chainId]: connection } : acc),
    {},
  );
}

export const NetworkConnector = () => {
  const [networks, setNetworks] = useState<any[]>([]);

  useEffect(() => {
    const setupConnections = async () => {
      const connections = await getChains();
      setNetworks(connections);
    };

    setupConnections();
  }, []);

  const onConnect = (activeType: 'localNode' | 'externalNode', name: string) => async () => {
    // const selectedNetwork = {
    //   polkadot: { ...polkadot, activeType },
    //   westend: { ...westend, activeType },
    // }[name];
    const selectedNetwork = networks.find((n) => n.name === name);
    const api = await createConnection({ ...selectedNetwork, activeType });
    console.log(`${selectedNetwork.name} ==> genesis ===> `, api?.genesisHash.toHex());
  };

  return (
    <ul className="list-none grid gap-y-2">
      {networks.map((n) => (
        <li className="grid grid-cols-3 gap-x-4" key={n.name}>
          <span>{n.name}</span>
          <button
            type="button"
            className="border bg-green-200 border-green-600"
            onClick={onConnect('localNode', n.name)}
          >
            local node
          </button>
          <button
            type="button"
            className="border bg-red-200 border-red-600"
            onClick={onConnect('externalNode', n.name)}
          >
            rpc node
          </button>
        </li>
      ))}
    </ul>
  );
};
