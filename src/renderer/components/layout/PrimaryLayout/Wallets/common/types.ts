import { Chain } from '@renderer/domain/chain';
import { ChainId, WalletType } from '@renderer/domain/shared-kernel';
import { AccountDS, WalletDS } from '@renderer/services/storage';

export type ChainWithAccounts = Chain & { accounts: AccountDS[] };
export type RootAccount = AccountDS & { chains: ChainWithAccounts[]; amount: number };
export type WalletStructure = WalletDS & { rootAccounts: RootAccount[]; amount: number };

export type WalletGroupItem = AccountDS | WalletStructure;
export type GroupedWallets = Record<WalletType, WalletGroupItem[]>;
export type ChainsRecord = Record<ChainId, Chain>;
