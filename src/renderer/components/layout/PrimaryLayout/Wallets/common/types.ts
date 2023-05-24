import { Chain } from '@renderer/domain/chain';
import { WalletType } from '@renderer/domain/shared-kernel';
import { AccountDS, WalletDS } from '@renderer/services/storage';

export type ChainWithAccounts = Chain & { isActive: boolean; accounts: AccountDS[] };
export type RootAccount = AccountDS & { chains: ChainWithAccounts[]; amount: number };
export type WalletStructure = WalletDS & { rootAccounts: RootAccount[]; isActive: boolean; amount: number };

export type WalletGroupItem = AccountDS | WalletStructure;
export type WalletGroupType = Record<WalletType, WalletGroupItem[]>;
