import { u8aToHex } from '@polkadot/util';
import { createKeyMulti } from '@polkadot/util-crypto';
import keyBy from 'lodash/keyBy';

import { dictionary } from '@shared/lib/utils';
import { walletUtils } from './wallet-utils';
import { AccountType, ChainType, CryptoType, ProxyType } from '@shared/core';
import type {
  ID,
  AccountId,
  Threshold,
  MultisigAccount,
  Account,
  BaseAccount,
  ChainAccount,
  ShardAccount,
  WalletConnectAccount,
  ProxiedAccount,
  Wallet,
  Chain,
  ChainId,
} from '@shared/core';
// TODO: resolve cross import
import { networkUtils } from '@entities/network';

export const accountUtils = {
  isBaseAccount,
  isChainAccount,
  isMultisigAccount,
  isChainDependant,
  isChainIdMatch,
  isChainAndCryptoMatch,
  isWalletConnectAccount,
  isProxiedAccount,
  isShardAccount,
  isAccountWithShards,
  getAccountsAndShardGroups,
  getMultisigAccountId,
  getWalletAccounts,
  getSignatoryAccounts,
  getBaseAccount,
  getDerivationPath,
  getAccountsForBalances,
  isAnyProxyType,
  isNonTransferProxyType,
  isStakingProxyType,
  isNonBaseVaultAccount,
  isEthereumBased,
  isCryptoTypeMatch,
};

function getMultisigAccountId(ids: AccountId[], threshold: Threshold, cryptoType = CryptoType.SR25519): AccountId {
  const accountId = createKeyMulti(ids, threshold);
  const isEthereum = cryptoType === CryptoType.ETHEREUM;

  return u8aToHex(isEthereum ? accountId.subarray(0, 20) : accountId);
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

function isChainDependant(account: Pick<Account, 'type'>): boolean {
  if (isBaseAccount(account)) return false;

  return !isMultisigAccount(account) || Boolean(account.chainId);
}

function isChainIdMatch(account: Pick<Account, 'type'>, chainId: ChainId): boolean {
  if (!isChainDependant(account)) return true;

  const chainAccountMatch = isChainAccount(account) && account.chainId === chainId;
  const shardAccountMatch = isShardAccount(account) && account.chainId === chainId;
  const walletConnectAccountMatch = isWalletConnectAccount(account) && account.chainId === chainId;
  const proxiedAccountMatch = isProxiedAccount(account) && account.chainId === chainId;
  const multisigWalletMatch = isMultisigAccount(account) && account.chainId === chainId;

  return (
    chainAccountMatch || walletConnectAccountMatch || shardAccountMatch || proxiedAccountMatch || multisigWalletMatch
  );
}

function isChainAndCryptoMatch(account: Account, chain: Chain): boolean {
  return isChainDependant(account) ? isChainIdMatch(account, chain.chainId) : isCryptoTypeMatch(account, chain);
}

function isCryptoTypeMatch(account: Account, chain: Chain): boolean {
  const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;

  return isWalletConnectAccount(account) || account.cryptoType === cryptoType;
}

function isMultisigAccount(account: Pick<Account, 'type'>): account is MultisigAccount {
  return account.type === AccountType.MULTISIG;
}

function isProxiedAccount(account: Pick<Account, 'type'>): account is ProxiedAccount {
  return account.type === AccountType.PROXIED;
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

function getSignatoryAccounts<T extends Account>(accountIds: AccountId[], accounts: T[]): T[] {
  const accountsMap = keyBy(accounts, 'accountId');

  return accountIds.map((id) => accountsMap[id]);
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

    return filterFn?.(account) ?? true;
  });
}

function isAnyProxyType({ proxyType }: ProxiedAccount): boolean {
  return proxyType === ProxyType.ANY;
}

function isNonTransferProxyType({ proxyType }: ProxiedAccount): boolean {
  return proxyType === ProxyType.NON_TRANSFER;
}

function isStakingProxyType({ proxyType }: ProxiedAccount): boolean {
  return proxyType === ProxyType.STAKING;
}

function isNonBaseVaultAccount(account: Account, wallet: Wallet): boolean {
  return !walletUtils.isPolkadotVault(wallet) || !accountUtils.isBaseAccount(account);
}

function isEthereumBased({ chainType }: Account): boolean {
  return chainType === ChainType.ETHEREUM;
}
