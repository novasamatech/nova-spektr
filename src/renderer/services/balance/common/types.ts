import { PromiseExtended, IndexableType } from 'dexie';
// import { ApiPromise } from '@polkadot/api';

import { HexString } from '@renderer/domain/types';
import { Balance } from '@renderer/services/storage';
import { ExtendedChain } from '@renderer/services/network/common/types';

export interface IBalanceStorage {
  getBalance: (publicKey: HexString, chainId: HexString, assetId: string) => PromiseExtended<Balance | undefined>;
  getBalances: (publicKey: HexString) => PromiseExtended<Balance[]>;
  updateBalance: (balance: Balance) => PromiseExtended<IndexableType>;
}

export interface IBalanceService {
  getBalance: (publicKey: HexString, chainId: HexString, assetId: string) => PromiseExtended<Balance | undefined>;
  getBalances: (publicKey: HexString) => PromiseExtended<Balance[]>;
  subscribeBalances: (chain: ExtendedChain, parachain: ExtendedChain | undefined, publicKey: HexString) => Promise<any>;
}
