import { u8aToHex } from '@polkadot/util';
import { createKeyMulti } from '@polkadot/util-crypto';

import { AccountType } from '@shared/core';
import type {
  AccountId,
  ChainId,
  Threshold,
  MultisigAccount,
  Account,
  BaseAccount,
  ChainAccount,
  WalletConnectAccount,
  Wallet,
  ShardAccount,
} from '@shared/core';

export const accountUtils = {
  isBaseAccount,
  isChainAccount,
  isMultisigAccount,
  isChainIdMatch,
  isWalletConnectAccount,
  isShardAccount,
  getAccountsAndShardGroups,
  getMultisigAccountId,
  getAllAccountIds,
  getWalletAccounts,
  getDerivationPath,
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

function isChainIdMatch(account: Pick<Account, 'type'>, chainId: ChainId): boolean {
  if (isBaseAccount(account) || isMultisigAccount(account)) return true;

  const chainAccountMatch = isChainAccount(account) && account.chainId === chainId;
  const walletConnectAccountMatch = isWalletConnectAccount(account) && account.chainId === chainId;

  return chainAccountMatch || walletConnectAccountMatch;
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

function getAccountsAndShardGroups(accounts: Array<ChainAccount | ShardAccount>): Array<ChainAccount | ShardAccount[]> {
  const shardsIndexes: Record<ShardAccount['groupId'], number> = {};

  return accounts.reduce<Array<ChainAccount | ShardAccount[]>>((acc, account) => {
    if (!accountUtils.isShardAccount(account)) {
      acc.push(account);

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

function getWalletAccounts<T extends Account>(walletId: Wallet['id'], accounts: T[]): T[] {
  return accounts.filter((account) => account.walletId === walletId);
}

function getDerivationPath(data: ChainAccount | ShardAccount | ChainAccount[] | ShardAccount[]): string {
  if (!Array.isArray(data)) return data.derivationPath;

  const [empty, network, keyType] = data[0].derivationPath.split('//');

  return [empty, network, keyType, `0..${data.length - 1}`].join('//');
}
