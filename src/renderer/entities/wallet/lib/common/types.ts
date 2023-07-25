import { WalletDS, ID } from '@renderer/shared/api/storage';

import { Wallet } from '@renderer/entities/wallet/model/wallet';

export interface IWalletService {
  getWallet: (walletId: string) => Promise<WalletDS | undefined>;
  getWallets: <T extends Wallet>(where?: Partial<T>) => Promise<WalletDS[]>;
  getLiveWallets: <T extends Wallet>(where?: Partial<T>) => WalletDS[];
  addWallet: (wallet: Wallet) => Promise<ID>;
  updateWallet: (wallet: Wallet) => Promise<ID>;
  deleteWallet: (walletId: string) => Promise<void>;
}
