import { ChainId, PublicKey } from '@renderer/domain/shared-kernel';
import { BalanceDS } from '@renderer/services/storage/common/types';
import { ExtendedChain } from '@renderer/services/network/common/types';

export interface IBalanceService {
  getBalance: (publicKey: PublicKey, chainId: ChainId, assetId: string) => Promise<BalanceDS | undefined>;
  getLiveBalance: (publicKey: PublicKey, chainId: ChainId, assetId: string) => BalanceDS | undefined;
  getLiveNetworkBalances: (publicKey: PublicKey, chainId: ChainId) => BalanceDS[] | undefined;
  getBalances: (publicKey: PublicKey) => Promise<BalanceDS[]>;
  subscribeBalances: (chain: ExtendedChain, parachain: ExtendedChain | undefined, publicKey: PublicKey) => Promise<any>;
  subscribeLockBalances: (chain: ExtendedChain, publicKey: PublicKey) => Promise<any>;
}
