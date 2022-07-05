import { ApiPromise, WsProvider } from '@polkadot/api';
import { ScProvider, WellKnownChain } from '@polkadot/rpc-provider/substrate-connect';

const polkadot = JSON.parse(
  '{"chainId":"91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3","name":"Polkadot","assets":[{"assetId":0,"symbol":"DOT","precision":10,"priceId":"polkadot","staking":"relaychain","buyProviders":{"ramp":{},"moonpay":{},"transak":{"network":"MAINNET"}}}],"nodes":[{"url":"wss://rpc.polkadot.io","name":"Parity node"},{"url":"wss://polkadot.api.onfinality.io/public-ws","name":"OnFinality node"},{"url":"wss://polkadot-rpc.dwellir.com","name":"Dwellir node"}],"explorers":[{"name":"Subscan","extrinsic":"https://polkadot.subscan.io/extrinsic/{hash}","account":"https://polkadot.subscan.io/account/{address}","event":null},{"name":"Polkascan","extrinsic":"https://polkascan.io/polkadot/extrinsic/{hash}","account":"https://polkascan.io/polkadot/account/{address}","event":"https://polkascan.io/polkadot/event/{event}"},{"name":"Sub.ID","account":"https://sub.id/{address}"}],"color":"linear-gradient(315deg, #D43079 0%, #F93C90 100%)","icon":"https://raw.githubusercontent.com/nova-wallet/nova-utils/master/icons/chains/white/Polkadot.svg","addressPrefix":0,"types":{"url":"https://raw.githubusercontent.com/nova-wallet/nova-utils/master/chains/v2/types/polkadot.json","overridesCommon":true},"externalApi":{"staking":{"type":"subquery","url":"https://nova-wallet-polkadot.gapi.subquery.network"},"history":{"type":"subquery","url":"https://nova-wallet-polkadot.gapi.subquery.network"},"crowdloans":{"type":"github","url":"https://raw.githubusercontent.com/nova-wallet/nova-utils/master/crowdloan/polkadot-dev.json"}},"options":["crowdloans"],"id":1,"activeType":"disabled"}'
);
const westend = JSON.parse(
  '{"chainId":"e143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e","name":"Westend","assets":[{"assetId":0,"symbol":"WND","precision":12,"staking":"relaychain"}],"nodes":[{"url":"wss://westend-rpc.polkadot.io","name":"Parity node"},{"url":"wss://westend.api.onfinality.io/public-ws","name":"OnFinality node"},{"url":"wss://westend-rpc.dwellir.com","name":"Dwellir node"},{"url":"wss://rpc.pinknode.io/westend/explorer","name":"Pinknode node"}],"explorers":[{"name":"Subscan","extrinsic":"https://westend.subscan.io/extrinsic/{hash}","account":"https://westend.subscan.io/account/{address}","event":null}],"color":"linear-gradient(315deg, #434852 0%, #787F92 100%)","icon":"https://raw.githubusercontent.com/nova-wallet/nova-utils/master/icons/chains/white/Westend.svg","addressPrefix":42,"types":{"url":"https://raw.githubusercontent.com/nova-wallet/nova-utils/master/chains/v2/types/westend.json","overridesCommon":true},"externalApi":{"staking":{"type":"subquery","url":"https://nova-wallet-westend.gapi.subquery.network"},"history":{"type":"subquery","url":"https://nova-wallet-westend.gapi.subquery.network"},"crowdloans":{"type":"github","url":"https://raw.githubusercontent.com/nova-wallet/nova-utils/master/crowdloan/westend.json"}},"options":["testnet","crowdloans"],"id":3,"activeType":"disabled"}'
);

const KnownChains: Record<string, WellKnownChain> = {
  Kusama: WellKnownChain.ksmcc3,
  Polkadot: WellKnownChain.polkadot,
  Westend: WellKnownChain.westend2,
};

export function getKnownChainId(chainId: string): WellKnownChain | undefined {
  return KnownChains[chainId];
}

const enum ActiveType {
  LOCAL_NODE = 'localNode',
  EXTERNAL_NODE = 'externalNode',
}

export const createConnection = async (network: any): Promise<ApiPromise | undefined> => {
  let provider: any | undefined;

  if (network.activeType === ActiveType.LOCAL_NODE) {
    const chainId = getKnownChainId(network.name);

    if (chainId) {
      provider = new ScProvider(chainId);
      await provider.connect();
    } else {
      console.log(123);
    }
  } else if (network.activeType === ActiveType.EXTERNAL_NODE) {
    // TODO: Add possibility to select best node
    provider = new WsProvider(network.nodes[0].url);
  }

  if (!provider) return;
  return ApiPromise.create({ provider });
};

const App = () => {
  const onConnect = (activeType: 'localNode' | 'externalNode', name: 'polkadot' | 'westend') => async () => {
    const selectedNetwork = {
      polkadot: { ...polkadot, activeType },
      westend: { ...westend, activeType },
    }[name];
    const api = await createConnection(selectedNetwork);
    console.log('genesis ====> ', api?.genesisHash.toHex());
  };

  return (
    <ul className="list-none">
      <li className="flex gap-3">
        <span>Polkadot</span>
        <button type="button" className="bg-green-200 border-green-600" onClick={onConnect('localNode', 'polkadot')}>
          local node
        </button>
        <button type="button" className="bg-red-200 border-red-600" onClick={onConnect('externalNode', 'polkadot')}>
          rpc node
        </button>
      </li>
      <li className="flex gap-3">
        <span>Westend</span>
        <button type="button" className="bg-green-200 border-green-600" onClick={onConnect('localNode', 'westend')}>
          local node
        </button>
        <button type="button" className="bg-red-200 border-red-600" onClick={onConnect('externalNode', 'westend')}>
          rpc node
        </button>
      </li>
    </ul>
  );
};

export default App;
