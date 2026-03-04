import { type Asset } from './asset';
import { type ChainId, type HexString } from './general';

export type Chain = {
  // Also known as "genesis hash"
  chainId: ChainId;
  parentId?: HexString;
  specName: string;
  name: string;
  assets: Asset[];
  nodes: RpcNode[];
  explorers?: Explorer[];
  icon: string;
  addressPrefix: number;
  legacyAddressPrefix?: number;
  externalApi?: Partial<Record<ExternalType, ExternalValue[]>>;
  options?: ChainOptions[];
  additional?: ChainAdditional;
};

export type ChainAdditional = {
  identityChain: ChainId;
  timelineChain: ChainId;

  // Supports metadata proofs
  supportsGenericLedgerApp: boolean;

  // Expected block time in milliseconds (overrides API constants when set)
  defaultBlockTime?: number;
};

export const enum ChainOptions {
  TESTNET = 'testnet',
  GOVERNANCE = 'governance',
  MULTISIG = 'multisig',
  REGULAR_PROXY = 'regular_proxy',
  PURE_PROXY = 'pure_proxy',
  ETHEREUM_BASED = 'ethereum_based',
  VESTED_TRANSFER = 'vested_transfer',
  MULTI_TRANSFER = 'multi_transfer',
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
  DELEGATIONS = 'governance-delegations',
  COLLECTIVES = 'collectives',
}
type HistoryType = 'subquery' | 'github';
