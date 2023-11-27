import { u8aToHex } from '@polkadot/util';
import { createKeyMulti } from '@polkadot/util-crypto';

import { AccountType, ChainId } from '@shared/core';
import type {
  AccountId,
  Threshold,
  MultisigAccount,
  Account,
  ChainAccount,
  WalletConnectAccount,
  Wallet,
  ShardAccount,
  BaseAccount,
} from '@shared/core';

export const accountUtils = {
  isBaseAccount,
  isChainAccount,
  isMultisigAccount,
  isChainIdMatch,
  isWalletConnectAccount,
  isShardAccount,
  getAccountsAndShardGroups,
  isAccountWithShards,
  getMultisigAccountId,
  getAllAccountIds,
  getWalletAccounts,
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

function isAccountWithShards(accounts: Pick<Account, 'type'> | ShardAccount[]): boolean {
  return Array.isArray(accounts) && accounts[0].type === AccountType.SHARD;
}

function isChainIdMatch(account: Pick<Account, 'type'>, chainId: ChainId): boolean {
  if (isBaseAccount(account) || isMultisigAccount(account)) return true;

  const chainAccountMatch = isChainAccount(account) && account.chainId === chainId;
  const walletConnectAccountMatch = isWalletConnectAccount(account) && account.chainId === chainId;
  const shardAccountMatch = isShardAccount(account) && account.chainId === chainId;

  return chainAccountMatch || walletConnectAccountMatch || shardAccountMatch;
}

function isMultisigAccount(account: Pick<Account, 'type'>): account is MultisigAccount {
  return account.type === AccountType.MULTISIG;
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

function getWalletAccounts<T extends Account>(walletId: Wallet['id'], accounts: T[]): T[] {
  return accounts.filter((account) => account.walletId === walletId);
}

function getAccountsAndShardGroups(accounts: Account[]): Array<ChainAccount | ShardAccount[]> {
  const shardsIndexes: Record<ShardAccount['groupId'], number> = {};

  return accounts.reduce<Array<ChainAccount | ShardAccount[]>>((acc, account) => {
    if (accountUtils.isBaseAccount(account)) {
      return acc;
    }

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
