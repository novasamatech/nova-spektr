import { Chain } from '@renderer/entities/chain/model/chain';
import { ChainId, WalletType } from '@renderer/domain/shared-kernel';
import { AccountDS, WalletDS } from '@renderer/services/storage';

export type ChainWithAccounts = Chain & { accounts: AccountDS[] };
export type RootAccount = AccountDS & { chains: ChainWithAccounts[]; amount: number };
export type MultishardStructure = { rootAccounts: RootAccount[]; amount: number };
export type MultishardWallet = WalletDS & MultishardStructure;

type Selectable<T> = T & { isSelected: boolean };
export type SelectableAccount = Selectable<AccountDS>;
export type SelectableChain = Selectable<Chain & { accounts: SelectableAccount[]; selectedAmount: number }>;
export type SelectableRoot = Selectable<AccountDS & { chains: SelectableChain[]; selectedAmount: number }>;
export type SelectableShards = { rootAccounts: SelectableRoot[]; amount: number };

export type WalletGroupItem = AccountDS | MultishardWallet;
export type GroupedWallets = Record<WalletType, WalletGroupItem[]>;
export type ChainsRecord = Record<ChainId, Chain>;
