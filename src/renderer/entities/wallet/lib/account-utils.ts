import { u8aToHex } from '@polkadot/util';
import { createKeyMulti } from '@polkadot/util-crypto';
import keyBy from 'lodash/keyBy';

// TODO: resolve cross import
import { networkUtils } from '@entities/network';
import { walletUtils } from './wallet-utils';
import { AccountType, ChainType, CryptoType, ProxyType, ProxyVariant } from '@shared/core';
import type {
  ID,
  AccountId,
  Threshold,
  MultisigAccount,
  ChainAccount,
  ShardAccount,
  WcAccount,
  ProxiedAccount,
  Wallet,
  BaseAccount,
  Chain,
  ChainId,
  Account,
} from '@shared/core';

export const accountUtils = {
  isBaseAccount,
  isChainAccount,
  isMultisigAccount,
  isWcAccount,
  isProxiedAccount,
  isPureProxiedAccount,
  isShardAccount,

  isChainDependant,
  isChainIdMatch,
  isChainAndCryptoMatch,
  isAccountWithShards,
  isNonBaseVaultAccount,
  isEthereumBased,
  isCryptoTypeMatch,

  getAccountsAndShardGroups,
  getMultisigAccountId,
  getSignatoryAccounts,
  getBaseAccount,
  getDerivationPath,

  isAnyProxyType,
  isNonTransferProxyType,
  isStakingProxyType,
};

// Account types

function isBaseAccount(account: Partial<Account>): account is BaseAccount {
  return account.type === AccountType.BASE;
}

function isChainAccount(account: Partial<Account>): account is ChainAccount {
  return account.type === AccountType.CHAIN;
}

function isWcAccount(account: Partial<Account>): account is WcAccount {
  return account.type === AccountType.WALLET_CONNECT;
}

function isShardAccount(account: Partial<Account>): account is ShardAccount {
  return account.type === AccountType.SHARD;
}

function isMultisigAccount(account: Partial<Account>): account is MultisigAccount {
  return account.type === AccountType.MULTISIG;
}

function isProxiedAccount(account: Partial<Account>): account is ProxiedAccount {
  return account.type === AccountType.PROXIED;
}

function isPureProxiedAccount(account: Partial<Account>): account is ProxiedAccount {
  return isProxiedAccount(account) && account.proxyVariant === ProxyVariant.PURE;
}

// Matchers

function isAccountWithShards(accounts: ChainAccount | ShardAccount[]): accounts is ShardAccount[] {
  return Array.isArray(accounts) && isShardAccount(accounts[0]);
}

function isChainDependant(account: Partial<Account>): boolean {
  if (isBaseAccount(account)) return false;

  return !isMultisigAccount(account) || Boolean(account.chainId);
}

function isChainIdMatch(account: Account, chainId: ChainId): boolean {
  if (!isChainDependant(account)) return true;

  const chainAccountMatch = isChainAccount(account) && account.chainId === chainId;
  const shardAccountMatch = isShardAccount(account) && account.chainId === chainId;
  const wcAccountMatch = isWcAccount(account) && account.chainId === chainId;
  const proxiedAccountMatch = isProxiedAccount(account) && account.chainId === chainId;
  const multisigWalletMatch = isMultisigAccount(account) && account.chainId === chainId;

  return chainAccountMatch || wcAccountMatch || shardAccountMatch || proxiedAccountMatch || multisigWalletMatch;
}

function isChainAndCryptoMatch(account: Account, chain: Chain): boolean {
  return isChainDependant(account) ? isChainIdMatch(account, chain.chainId) : isCryptoTypeMatch(account, chain);
}

function isCryptoTypeMatch(account: Account, chain: Chain): boolean {
  const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;

  return isWcAccount(account) || (account as BaseAccount).cryptoType === cryptoType;
}

function isEthereumBased(account: Account): boolean {
  return account.chainType === ChainType.ETHEREUM;
}

// Get specific accounts

function getMultisigAccountId(ids: AccountId[], threshold: Threshold, cryptoType = CryptoType.SR25519): AccountId {
  const accountId = createKeyMulti(ids, threshold);
  const isEthereum = cryptoType === CryptoType.ETHEREUM;

  return u8aToHex(isEthereum ? accountId.subarray(0, 20) : accountId);
}

function getAccountsAndShardGroups(accounts: Account[]): Array<ChainAccount | ShardAccount[]> {
  const shardsIndexes: Record<string, number> = {};

  return accounts.reduce<Array<ChainAccount | ShardAccount[]>>((acc, account) => {
    if (isBaseAccount(account)) return acc;

    if (!isShardAccount(account)) {
      // @ts-ignore
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

function getBaseAccount(accounts: Account[], walletId?: ID): BaseAccount | undefined {
  return accounts.find((a) => {
    const walletMatch = !walletId || walletId === a.walletId;

    return walletMatch && isBaseAccount(a);
  }) as BaseAccount;
}

function getSignatoryAccounts<T extends BaseAccount>(accountIds: AccountId[], accounts: T[]): T[] {
  const accountsMap = keyBy(accounts, 'accountId');

  return accountIds.map((id) => accountsMap[id]);
}

type DerivationPathLike = { derivationPath: string };
function getDerivationPath(data: DerivationPathLike | DerivationPathLike[]): string {
  if (!Array.isArray(data)) return data.derivationPath;

  return data[0].derivationPath.replace(/\d+$/, `0..${data.length - 1}`);
}

// Proxied accounts

function isAnyProxyType(account: ProxiedAccount): boolean {
  return account.proxyType === ProxyType.ANY;
}

function isNonTransferProxyType(account: ProxiedAccount): boolean {
  return account.proxyType === ProxyType.NON_TRANSFER;
}

function isStakingProxyType(account: ProxiedAccount): boolean {
  return account.proxyType === ProxyType.STAKING;
}

function isNonBaseVaultAccount(account: Account, wallet: Wallet): boolean {
  return !walletUtils.isPolkadotVault(wallet) || !accountUtils.isBaseAccount(account);
}
