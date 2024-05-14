import { TokenBalance } from './balance';
import { ChainId } from './general';

export type Asset = {
  name: string;
  assetId: number;
  symbol: string;
  staking?: StakingType;
  precision: number;
  priceId?: string;
  icon: string;
  type?: AssetType;
  typeExtras?: StatemineExtras | OrmlExtras;
};

export const enum StakingType {
  RELAYCHAIN = 'relaychain',
  // PARACHAIN = 'parachain',
}

export const enum AssetType {
  ORML = 'orml',
  STATEMINE = 'statemine',
}

export type StatemineExtras = {
  assetId: string;
};

export type OrmlExtras = {
  currencyIdScale: string;
  currencyIdType: string;
  existentialDeposit: string;
  transfersEnabled?: boolean;
};

export type AssetByChains = {
  name: string;
  precision: number;
  icon: string;
  symbol: string;
  priceId?: string;
  totalBalance?: TokenBalance;
  chains: {
    chainId: ChainId;
    name: string;
    assetId: number;
    assetSymbol: string;
    balance?: TokenBalance;
    type?: AssetType;
    typeExtras?: StatemineExtras | OrmlExtras;
  }[];
};
