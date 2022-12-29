import { Chain } from '@renderer/domain/chain';
import { Wallet } from '@renderer/domain/wallet';
import { AccountDS } from '@renderer/services/storage';

export type ChainWithAccounts = Chain & { isActive: boolean; accounts: AccountDS[] };
export type RootAccount = AccountDS & { chains: ChainWithAccounts[]; amount: number };
export type WalletStructure = Wallet & { rootAccounts: RootAccount[]; isActive: boolean; amount: number };
