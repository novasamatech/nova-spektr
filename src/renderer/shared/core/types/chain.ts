import type { Asset } from './asset';
import type { ChainId, HexString } from './general';

export type Chain = {
  chainId: ChainId;
  parentId?: HexString;
  specName?: string;
  name: string;
  assets: Asset[];
  nodes: RpcNode[];
  explorers?: Explorer[];
  icon: string;
  addressPrefix: number;
  externalApi?: Record<ExternalType, ExternalValue[]>;
  options?: ChainOptions[];
};

export type ChainOptions = 'testnet' | 'crowdloans';

export type RpcNode = {
  url: string;
  name: string;
};

export type Explorer = {
  name: string;
  extrinsic?: string;
  account?: string;
  event?: string;
  multisig?: string;
};

type ExternalValue = {
  type: HistoryType;
  url: string;
};

type ExternalType = 'history' | 'staking' | 'crowdloans';
type HistoryType = 'subquery' | 'github';
