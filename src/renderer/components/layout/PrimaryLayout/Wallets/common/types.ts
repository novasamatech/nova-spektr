import { Chain } from '@renderer/domain/chain';
import { ChainId, WalletType } from '@renderer/domain/shared-kernel';
import { AccountDS, WalletDS } from '@renderer/services/storage';

export type ChainWithAccounts = Chain & { accounts: AccountDS[] };
export type RootAccount = AccountDS & { chains: ChainWithAccounts[]; amount: number };
export type MultishardStructure = { rootAccounts: RootAccount[]; amount: number };
export type MultishardWallet = WalletDS & MultishardStructure;

export type WalletGroupItem = AccountDS | MultishardWallet;
export type GroupedWallets = Record<WalletType, WalletGroupItem[]>;
export type ChainsRecord = Record<ChainId, Chain>;
