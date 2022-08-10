import { PromiseExtended } from 'dexie';

import { HexString } from '@renderer/domain/types';
import { Balance } from '@renderer/services/storage';
import { ExtendedChain } from '@renderer/services/network/common/types';

export interface IBalanceService {
  getBalance: (publicKey: HexString, chainId: HexString, assetId: string) => Balance | undefined;
  getBalances: (publicKey: HexString) => PromiseExtended<Balance[]>;
  subscribeBalances: (chain: ExtendedChain, parachain: ExtendedChain | undefined, publicKey: HexString) => Promise<any>;
}
