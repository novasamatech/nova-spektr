import { type Address, type Chain } from '@/shared/core';

export const MOCK_ADDRESSES = {
  alice: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as Address,
  bob: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' as Address,
  charlie: '5GNJqTPyNqANBkUVMN1LPPrxXnFouWA2MRQg3gKrUYgw6J9i' as Address,
  dave: '5DfhGyQdFobKM8NsWvEeAKk5EhQhro4TPAqv3HRfCCUjQcSo' as Address,
  eve: '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw' as Address,
};

export const CHAIN_ICON_BASE = 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/chains';

export const mockChain = (name: string, iconName: string, chainId: string): Chain =>
  ({
    chainId,
    name,
    specName: name.toLowerCase().replace(/ /g, '-'),
    icon: `${CHAIN_ICON_BASE}/${iconName}.svg`,
    addressPrefix: 0,
    nodes: [],
    assets: [],
  }) as unknown as Chain;

export const MOCK_CHAINS = {
  polkadot: mockChain('Polkadot', 'Polkadot', '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'),
  kusama: mockChain('Kusama', 'Kusama', '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe'),
  polkadotAssetHub: mockChain(
    'Polkadot Asset Hub',
    'Polkadot_Asset_Hub',
    '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
  ),
  westend: mockChain('Westend', 'Westend', '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e'),
} as const;

export const getChain = (name: string): Chain => {
  const key = Object.keys(MOCK_CHAINS).find(
    (k) => MOCK_CHAINS[k as keyof typeof MOCK_CHAINS].name.toLowerCase() === name.toLowerCase(),
  );

  return key ? MOCK_CHAINS[key as keyof typeof MOCK_CHAINS] : MOCK_CHAINS.polkadot;
};
