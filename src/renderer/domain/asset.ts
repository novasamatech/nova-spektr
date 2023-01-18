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
  PARACHAIN = 'XXX',
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
