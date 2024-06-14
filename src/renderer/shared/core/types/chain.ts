import type { Asset } from './asset';
import type { ChainId, HexString } from './general';

export type Chain = {
  chainId: ChainId;
  parentId?: HexString;
  specName: string;
  name: string;
  assets: Asset[];
  nodes: RpcNode[];
  explorers?: Explorer[];
  icon: string;
  addressPrefix: number;
  externalApi?: Record<ExternalType, ExternalValue[]>;
  options?: ChainOptions[];
};

export const enum ChainOptions {
  TESTNET = 'testnet',
  GOVERNANCE = 'governance',
  MULTISIG = 'multisig',
  REGULAR_PROXY = 'regular_proxy',
  PURE_PROXY = 'pure_proxy',
  ETHEREUM_BASED = 'ethereum_based',
}

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

export const enum ExternalType {
  HISTORY = 'history',
  STAKING = 'staking',
  CROWDLOANS = 'crowdloans',
  PROXY = 'proxy',
  MULTISIG = 'multisig',
}
type HistoryType = 'subquery' | 'github';
