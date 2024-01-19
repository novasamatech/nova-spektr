import { u8aToHex } from '@polkadot/util';
import { createKeyMulti } from '@polkadot/util-crypto';

import { dictionary } from '@shared/lib/utils';
import { walletUtils } from './wallet-utils';
import { AccountType, Wallet } from '@shared/core';
import type {
  ID,
  AccountId,
  ChainId,
  Threshold,
  MultisigAccount,
  Account,
  BaseAccount,
  ChainAccount,
  ShardAccount,
  WalletConnectAccount,
  ProxiedAccount,
} from '@shared/core';

export const accountUtils = {
  isBaseAccount,
  isChainAccount,
  isMultisigAccount,
  isChainIdMatch,
  isWalletConnectAccount,
  isProxiedAccount,
  isShardAccount,
  isAccountWithShards,
  getAccountsAndShardGroups,
  getMultisigAccountId,
  getAllAccountIds,
  getWalletAccounts,
  getBaseAccount,
  getDerivationPath,
  getAccountsForBalances,
};

function getMultisigAccountId(ids: AccountId[], threshold: Threshold): AccountId {
  return u8aToHex(createKeyMulti(ids, threshold));
}

function isBaseAccount(account: Pick<Account, 'type'>): account is BaseAccount {
  return account.type === AccountType.BASE;
}

function isChainAccount(account: Pick<Account, 'type'>): account is ChainAccount {
  return account.type === AccountType.CHAIN;
}

function isWalletConnectAccount(account: Pick<Account, 'type'>): account is WalletConnectAccount {
  return account.type === AccountType.WALLET_CONNECT;
}

function isShardAccount(account: Pick<Account, 'type'>): account is ShardAccount {
  return account.type === AccountType.SHARD;
}

function isAccountWithShards(accounts: Pick<Account, 'type'> | ShardAccount[]): accounts is ShardAccount[] {
  return Array.isArray(accounts) && isShardAccount(accounts[0]);
}

function isChainIdMatch(account: Pick<Account, 'type'>, chainId: ChainId): boolean {
  if (isBaseAccount(account) || isMultisigAccount(account)) return true;

  const chainAccountMatch = isChainAccount(account) && account.chainId === chainId;
  const shardAccountMatch = isShardAccount(account) && account.chainId === chainId;
  const walletConnectAccountMatch = isWalletConnectAccount(account) && account.chainId === chainId;
  const proxiedAccountMatch = isProxiedAccount(account) && account.chainId === chainId;

  return chainAccountMatch || walletConnectAccountMatch || shardAccountMatch || proxiedAccountMatch;
}

function isMultisigAccount(account: Pick<Account, 'type'>): account is MultisigAccount {
  return account.type === AccountType.MULTISIG;
}

function isProxiedAccount(account: Pick<Account, 'type'>): account is ProxiedAccount {
  return account.type === AccountType.PROXIED;
}

function getAllAccountIds(accounts: Account[], chainId: ChainId): AccountId[] {
  const uniqIds = accounts.reduce<Set<AccountId>>((acc, account) => {
    if (accountUtils.isChainIdMatch(account, chainId)) {
      acc.add(account.accountId);
    }

    if (accountUtils.isMultisigAccount(account)) {
      account.signatories.forEach((signatory) => acc.add(signatory.accountId));
    }

    return acc;
  }, new Set());

  return Array.from(uniqIds);
}

function getAccountsAndShardGroups(accounts: Account[]): Array<ChainAccount | ShardAccount[]> {
  const shardsIndexes: Record<string, number> = {};

  return accounts.reduce<Array<ChainAccount | ShardAccount[]>>((acc, account) => {
    if (accountUtils.isBaseAccount(account)) return acc;

    if (!accountUtils.isShardAccount(account)) {
      acc.push(account as ChainAccount);

      return acc;
    }

    const existingGroupIndex = shardsIndexes[account.groupId];
    if (existingGroupIndex !== undefined) {
      (acc[existingGroupIndex] as ShardAccount[]).push(account);
    } else {
      acc.push([account]);
      shardsIndexes[account.groupId] = acc.length - 1;
    }

    return acc;
  }, []);
}

function getBaseAccount(accounts: Account[], walletId?: ID): BaseAccount | undefined {
  return accounts.find((a) => {
    const walletMatch = !walletId || walletId === a.walletId;

    return walletMatch && isBaseAccount(a);
  }) as BaseAccount;
}

function getWalletAccounts<T extends Account>(walletId: ID, accounts: T[]): T[] {
  return accounts.filter((account) => account.walletId === walletId);
}

type DerivationPathLike = Pick<ChainAccount, 'derivationPath'>;
function getDerivationPath(data: DerivationPathLike | DerivationPathLike[]): string {
  if (!Array.isArray(data)) return data.derivationPath;

  return data[0].derivationPath.replace(/\d+$/, `0..${data.length - 1}`);
}

function getAccountsForBalances(
  wallets: Wallet[],
  accounts: Account[],
  filterFn?: (account: Account) => boolean,
): Account[] {
  const walletsMap = dictionary(wallets, 'id', walletUtils.isPolkadotVault);

  return accounts.filter((account) => {
    if (accountUtils.isBaseAccount(account) && walletsMap[account.walletId]) return false;

    return filterFn?.(account) || true;
  });
}
