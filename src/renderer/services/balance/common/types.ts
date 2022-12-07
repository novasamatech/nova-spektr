import { ChainId, PublicKey } from '@renderer/domain/shared-kernel';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { BalanceDS } from '@renderer/services/storage/common/types';

export type FormattedBalance = {
  value: string;
  suffix: string;
  decimalPlaces: number;
};

export interface IBalanceService {
  getBalance: (publicKey: PublicKey, chainId: ChainId, assetId: string) => Promise<BalanceDS | undefined>;
  getLiveBalance: (publicKey: PublicKey, chainId: ChainId, assetId: string) => BalanceDS | undefined;
  getLiveNetworkBalances: (publicKeys: PublicKey[], chainId: ChainId) => BalanceDS[] | undefined;
  getBalances: (publicKey: PublicKey) => Promise<BalanceDS[]>;
  subscribeBalances: (
    chain: ExtendedChain,
    parachain: ExtendedChain | undefined,
    publicKeys: PublicKey[],
  ) => Promise<any>;
  subscribeLockBalances: (chain: ExtendedChain, publicKeys: PublicKey[]) => Promise<any>;
}
