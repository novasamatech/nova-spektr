import { IndexableType } from 'dexie';

import { Wallet } from '@renderer/domain/wallet';
import { WalletDS } from '@renderer/services/storage';

export interface IWalletService {
  getWallet: (walletId: string) => Promise<WalletDS | undefined>;
  getWallets: (where?: Record<string, any>) => Promise<WalletDS[]>;
  getActiveWallets: () => WalletDS[] | undefined;
  getLiveWallets: (where?: Record<string, any>) => WalletDS[] | undefined;
  toggleActiveWallet: (walletId: IndexableType) => Promise<void>;
  addWallet: (wallet: Wallet) => Promise<IndexableType>;
  updateWallet: (wallet: Wallet) => Promise<IndexableType>;
  deleteWallet: (walletId: string) => Promise<void>;
}
