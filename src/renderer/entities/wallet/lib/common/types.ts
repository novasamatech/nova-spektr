import { Wallet } from '@renderer/entities/wallet/model/wallet';
import { WalletDS, ID } from '@renderer/services/storage';

export interface IWalletService {
  getWallet: (walletId: string) => Promise<WalletDS | undefined>;
  getWallets: <T extends Wallet>(where?: Partial<T>) => Promise<WalletDS[]>;
  getLiveWallets: <T extends Wallet>(where?: Partial<T>) => WalletDS[];
  addWallet: (wallet: Wallet) => Promise<ID>;
  updateWallet: (wallet: Wallet) => Promise<ID>;
  deleteWallet: (walletId: string) => Promise<void>;
}
