import { u8aToHex } from '@polkadot/util';
import { createKeyMulti } from '@polkadot/util-crypto';
import keyBy from 'lodash/keyBy';

import { dictionary } from '@shared/lib/utils';
import { walletUtils } from './wallet-utils';
import { AccountType, ChainType, CryptoType, ProxyType, ProxyVariant } from '@shared/core';
import type {
  ID,
  AccountId,
  Threshold,
  MultisigAccount,
  Account_NEW,
  ChainAccount,
  ShardAccount,
  WcAccount,
  ProxiedAccount,
  Wallet_NEW,
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
  isPureProxiedAccount,
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

function isBaseAccount(account: Pick<Account_NEW, 'type'>): account is Account_NEW {
  return account.type === AccountType.BASE;
}

function isChainAccount(account: Pick<Account_NEW, 'type'>): account is ChainAccount {
  return account.type === AccountType.CHAIN;
}

function isWalletConnectAccount(account: Pick<Account_NEW, 'type'>): account is WcAccount {
  return account.type === AccountType.WALLET_CONNECT;
}

function isShardAccount(account: Pick<Account_NEW, 'type'>): account is ShardAccount {
  return account.type === AccountType.SHARD;
}

function isAccountWithShards(accounts: Pick<Account_NEW, 'type'> | ShardAccount[]): accounts is ShardAccount[] {
  return Array.isArray(accounts) && isShardAccount(accounts[0]);
}

function isChainDependant(account: Pick<Account_NEW, 'type'>): boolean {
  if (isBaseAccount(account)) return false;

  return !isMultisigAccount(account) || Boolean(account.chainId);
}

function isChainIdMatch(account: Pick<Account_NEW, 'type'>, chainId: ChainId): boolean {
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

function isChainAndCryptoMatch(account: Account_NEW, chain: Chain): boolean {
  return isChainDependant(account) ? isChainIdMatch(account, chain.chainId) : isCryptoTypeMatch(account, chain);
}

function isCryptoTypeMatch(account: Account_NEW, chain: Chain): boolean {
  const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;

  return account.cryptoType === cryptoType || isWalletConnectAccount(account);
}

function isMultisigAccount(account: Pick<Account_NEW, 'type'>): account is MultisigAccount {
  return account.type === AccountType.MULTISIG;
}

function isProxiedAccount(account: Pick<Account_NEW, 'type'>): account is ProxiedAccount {
  return account.type === AccountType.PROXIED;
}

function isPureProxiedAccount(account: Account_NEW): account is ProxiedAccount {
  return account.type === AccountType.PROXIED && (account as ProxiedAccount).proxyVariant === ProxyVariant.PURE;
}

function getAccountsAndShardGroups(accounts: Account_NEW[]): Array<ChainAccount | ShardAccount[]> {
  const shardsIndexes: Record<string, number> = {};

  return accounts.reduce<Array<ChainAccount | ShardAccount[]>>((acc, account) => {
    if (accountUtils.isBaseAccount(account)) return acc;

    if (!accountUtils.isShardAccount(account)) {
      acc.push(account);

      return acc;
    }

    const existingGroupIndex = shardsIndexes[(account as ShardAccount).groupId];
    if (existingGroupIndex !== undefined) {
      (acc[existingGroupIndex] as ShardAccount[]).push(account);
    } else {
      acc.push([account]);
      shardsIndexes[(account as ShardAccount).groupId] = acc.length - 1;
    }

    return acc;
  }, []);
}

function getBaseAccount(accounts: Account_NEW[], walletId?: ID): Account_NEW | undefined {
  return accounts.find((a) => {
    const walletMatch = !walletId || walletId === a.walletId;

    return walletMatch && isBaseAccount(a);
  }) as Account_NEW;
}

function getWalletAccounts<T extends Account_NEW>(walletId: ID, accounts: T[]): T[] {
  return accounts.filter((account) => account.walletId === walletId);
}

function getSignatoryAccounts<T extends Account_NEW>(accountIds: AccountId[], accounts: T[]): T[] {
  const accountsMap = keyBy(accounts, 'accountId');

  return accountIds.map((id) => accountsMap[id]);
}

type DerivationPathLike = Pick<ChainAccount, 'derivationPath'>;
function getDerivationPath(data: DerivationPathLike | DerivationPathLike[]): string {
  if (!Array.isArray(data)) return data.derivationPath;

  return data[0].derivationPath.replace(/\d+$/, `0..${data.length - 1}`);
}

function getAccountsForBalances(
  wallets: Wallet_NEW[],
  accounts: Account_NEW[],
  filterFn?: (account: Account_NEW) => boolean,
): Account_NEW[] {
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

function isNonBaseVaultAccount(account: Account_NEW, wallet: Wallet_NEW): boolean {
  return !walletUtils.isPolkadotVault(wallet) || !accountUtils.isBaseAccount(account);
}

function isEthereumBased({ chainType }: Account_NEW): boolean {
  return chainType === ChainType.ETHEREUM;
}
