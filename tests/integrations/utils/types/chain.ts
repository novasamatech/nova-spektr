export interface Asset {
  assetId: number;
  symbol: string;
  name: string;
  precision: number;
  priceId: string;
  icon: string;
}

export interface Node {
  url: string;
  name: string;
}

export interface Explorer {
  name: string;
  account: string;
  extrinsic: string;
  event: string;
}

export interface Types {
  url: string;
  overridesCommon: boolean;
}

export interface History {
  type: string;
  url: string;
}

export interface ExternalApi {
  history: History;
}

export interface ChainJSON {
  chainId: string;
  parentId: string;
  name: string;
  assets: Asset[];
  nodes: Node[];
  explorers: Explorer[];
  types: Types;
  externalApi: ExternalApi;
  color: string;
  icon: string;
  addressPrefix: number;
}
