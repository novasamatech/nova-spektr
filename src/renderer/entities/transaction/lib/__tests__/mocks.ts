import { type Asset, AssetType, type Chain, type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const TEST_ACCOUNT_ID = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as AccountId;
export const TEST_DESTINATION = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

export const createMockChain = (chainId: ChainId = 'polkadot' as ChainId): Chain => ({
  chainId,
  specName: 'polkadot',
  name: 'Test Chain',
  nodes: [],
  assets: [],
  icon: '',
  addressPrefix: 0,
  options: [],
});

export const createMockNativeAsset = (): Asset => ({
  name: 'DOT',
  assetId: 0 as any,
  symbol: 'DOT',
  precision: 10,
  type: AssetType.NATIVE,
  icon: {
    monochrome: '',
    colored: '',
  },
});

export const createMockOrmlAsset = (): Asset => ({
  name: 'USDT',
  assetId: 1 as any,
  symbol: 'USDT',
  precision: 6,
  type: AssetType.ORML,
  icon: {
    monochrome: '',
    colored: '',
  },
  typeExtras: {
    existentialDeposit: '1000000',
    currencyIdScale: '5',
    currencyIdType: 'u32',
  },
});

export const createMockStatemineAsset = (): Asset => ({
  name: 'KSM',
  assetId: 1984 as any,
  symbol: 'KSM',
  precision: 12,
  type: AssetType.STATEMINE,
  icon: {
    monochrome: '',
    colored: '',
  },
  typeExtras: {
    assetId: '1984',
    palletName: 'assets',
  },
});
