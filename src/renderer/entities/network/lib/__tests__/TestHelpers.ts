import BigNumber from 'bignumber.js';

import { chainsService } from '../chainsService';
import type { Chain, Balance, HexString } from '@renderer/shared/core';
import { PriceObject } from '@renderer/shared/api/price-provider/common/types';

export const chainMapping: { [key: string]: HexString } = {
  Polkadot: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  Kusama: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
  '3DPass': '0x6c5894837ad89b6d92b114a2fb3eafa8fe3d26a54848e3447015442cd6ef4e66',
  Westend: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
  Acala: '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
  Interlay: '0xbf88efe70e9e0e916416e8bed61f2b45717f517d7f3523e33c7b001e5ffcbc72',
  Astar: '0x9eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6',
  'Bifrost Kusama': '0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed',
  Litmus: '0xda5831fbc8570e3c6336d0d72b8c08f8738beefec812df21ef2afc2982ede09c',
  'Kusama Asset Hub': '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
  'Polkadot Asset Hub': '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
};

export function fakeBalance(chain: Chain, assetSymbol: string, free: string, accountId: HexString = '0x00'): Balance {
  const asset = chain.assets.find((asset) => asset.symbol === assetSymbol);
  if (!asset) {
    throw new Error(`Asset ${assetSymbol} not found in chain ${chain.name}`);
  }
  const freeBigNumber = new BigNumber(free).multipliedBy(new BigNumber(10).pow(asset.precision));

  return {
    accountId: accountId,
    chainId: chain.chainId,
    assetId: asset.assetId.toString(),
    free: freeBigNumber.toString(),
  } as Balance;
}

export function getChain(networkName: string) {
  return chainsService.getChainById(chainMapping[networkName])!;
}

export function fakePrice(tickers: { [ticker: string]: number }, chains: Chain[]): PriceObject {
  let priceObject: PriceObject = {};

  for (let ticker in tickers) {
    let asset;
    for (let chain of chains) {
      // Find the asset in the chain by ticker
      asset = chain.assets.find((asset) => asset.symbol === ticker);
      if (asset) {
        break;
      }
    }
    if (!asset) {
      throw new Error(`Asset ${ticker} not found in any chain`);
    }

    // Use asset's priceId instead of ticker
    priceObject[asset.priceId!] = {
      usd: {
        price: tickers[ticker],
        change: 0,
      },
    };
  }

  return priceObject;
}
