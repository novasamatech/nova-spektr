import { HexString } from '@renderer/domain/types';
import { Balance } from '@renderer/services/storage';
import { ExtendedChain } from '@renderer/services/network/common/types';

export interface IBalanceService {
  getBalance: (publicKey: HexString, chainId: HexString, assetId: string) => Balance | undefined;
  getBalances: (publicKey: HexString) => Promise<Balance[]>;
  subscribeBalances: (chain: ExtendedChain, parachain: ExtendedChain | undefined, publicKey: HexString) => Promise<any>;
}
