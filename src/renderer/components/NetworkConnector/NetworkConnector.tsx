import { useEffect, useState } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import type { ProviderInterface } from '@polkadot/rpc-provider/types';
import { ScProvider, WellKnownChain } from '@polkadot/rpc-provider/substrate-connect';

import chains from './chains.json';
import westmint from './chainSpecs/westend-westmint.json';
import statemine from './chainSpecs/kusama-statemine.json';
import karura from './chainSpecs/kusama-karura.json';
import acala from './chainSpecs/polkadot-acala.json';
import statemint from './chainSpecs/polkadot-statemint.json';

export const enum ActiveType {
  DISABLED = 'disabled',
  LOCAL_NODE = 'localNode',
  EXTERNAL_NODE = 'externalNode',
}

const ChainSpecs: Record<string, string> = {
  Statemine: JSON.stringify(statemine),
  Westmint: JSON.stringify(westmint),
  Karura: JSON.stringify(karura),
  Acala: JSON.stringify(acala),
  Statemint: JSON.stringify(statemint),
};

const RelayChainIds: Record<string, string> = {
  b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe: 'Kusama',
  '91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': 'Polkadot',
  e143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e: 'Westend',
};

const KnownChains: Record<string, string> = {
  Kusama: WellKnownChain.ksmcc3,
  Polkadot: WellKnownChain.polkadot,
  Westend: WellKnownChain.westend2,
  Rococo: WellKnownChain.rococo_v2_2,
};

export function getKnownChainName(chainId: string): string {
  return RelayChainIds[chainId] || '';
}

export function getKnownChainId(chainId: string): string {
  return KnownChains[chainId] || '';
}

export function getChainSpec(name: string): string {
  return ChainSpecs[name] || '';
}

// const CONFIG_API = 'https://raw.githubusercontent.com/nova-wallet/nova-utils/master/chains/v3/chains_dev.json';

export const createConnection = async (network: any): Promise<ApiPromise | undefined> => {
  let provider: ProviderInterface | undefined;

  if (network.activeType === ActiveType.LOCAL_NODE) {
    const chainId = getKnownChainId(network.name);

    if (chainId) {
      provider = new ScProvider(chainId);
      await provider.connect();
    } else {
      const chainSpec = getChainSpec(network.name);

      if (chainSpec) {
        if (network.parentId) {
          const parentName = getKnownChainName(network.parentId);
          const parentId = getKnownChainId(parentName);
          const relayProvider = new ScProvider(parentId);

          console.log(parentName, parentId, relayProvider);
          provider = new ScProvider(chainSpec, relayProvider);
        } else {
          provider = new ScProvider(chainSpec);
        }

        await provider.connect();
      } else {
        console.error('No chain spec found for', network.name);
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
  // const chains = await fetch(CONFIG_API);
  // return chains.json();
  return chains;
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
