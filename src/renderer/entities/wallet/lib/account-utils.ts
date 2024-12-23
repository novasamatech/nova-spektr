import { u8aToHex } from '@polkadot/util';
import { createKeyMulti } from '@polkadot/util-crypto';
import keyBy from 'lodash/keyBy';

// TODO: resolve cross import
import {
  type Account,
  type Chain,
  type ChainId,
  type FlexibleMultisigAccount,
  type ID,
  type MultisigAccount,
  type MultisigThreshold,
  type ProxiedAccount,
  type VaultBaseAccount,
  type VaultChainAccount,
  type VaultShardAccount,
  type Wallet,
  type WcAccount,
} from '@/shared/core';
import { AccountType, CryptoType, ProxyVariant } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
// TODO all this type checks should be defined in features with own context
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount, networkDomain } from '@/domains/network';
import { networkUtils } from '@/entities/network';

import { walletUtils } from './wallet-utils';

export const accountUtils = {
  isVaultBaseAccount,
  isVaultChainAccount,
  isVaultShardAccount,
  isRegularMultisigAccount,
  isFlexibleMultisigAccount,
  isMultisigAccount,
  isWcAccount,
  isProxiedAccount,
  isPureProxiedAccount,

  isChainDependant,
  isChainIdMatch,
  isChainAndCryptoMatch,
  isAccountWithShards,
  isNonBaseVaultAccount,
  isEthereumBased,
  isCryptoTypeMatch,

  getAddressesForWallet,
  getAccountsAndShardGroups,
  getMultisigAccountId,
  getSignatoryAccounts,
  getBaseAccount,
  getDerivationPath,

  isAnyProxyType,
  isNonTransferProxyType,
  isStakingProxyType,
  isGovernanceProxyType,
};

// Account types

function isVaultBaseAccount(account: Partial<AnyAccount>): account is VaultBaseAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    networkDomain.accountsService.isUniversalAccount(account) &&
    'accountType' in account &&
    account.accountType === AccountType.BASE
  );
}

function isVaultChainAccount(account: Partial<Account>): account is VaultChainAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    networkDomain.accountsService.isChainAccount(account) &&
    'accountType' in account &&
    account.accountType === AccountType.CHAIN
  );
}

function isWcAccount(account: Partial<Account>): account is WcAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    networkDomain.accountsService.isChainAccount(account) &&
    'accountType' in account &&
    account.accountType === AccountType.WALLET_CONNECT
  );
}

function isVaultShardAccount(account: Partial<Account>): account is VaultShardAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    networkDomain.accountsService.isChainAccount(account) &&
    'accountType' in account &&
    account.accountType === AccountType.SHARD
  );
}

function isRegularMultisigAccount(account: Partial<Account>): account is MultisigAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    networkDomain.accountsService.isChainAccount(account) &&
    'accountType' in account &&
    account.accountType === AccountType.MULTISIG
  );
}

function isFlexibleMultisigAccount(account: Partial<Account>): account is FlexibleMultisigAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    networkDomain.accountsService.isChainAccount(account) &&
    'accountType' in account &&
    account.accountType === AccountType.FLEXIBLE_MULTISIG
  );
}

function isMultisigAccount(account: Partial<Account>): account is MultisigAccount | FlexibleMultisigAccount {
  return isFlexibleMultisigAccount(account) || isRegularMultisigAccount(account);
}

function isProxiedAccount(account: Partial<Account>): account is ProxiedAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    networkDomain.accountsService.isChainAccount(account) &&
    'accountType' in account &&
    account.accountType === AccountType.PROXIED
  );
}

function isPureProxiedAccount(account: Partial<Account>): account is ProxiedAccount {
  return isProxiedAccount(account) && account.proxyVariant === ProxyVariant.PURE;
}

// Matchers

function isAccountWithShards(accounts: Account | VaultShardAccount[]): accounts is VaultShardAccount[] {
  return Array.isArray(accounts) && isVaultShardAccount(accounts[0]);
}

function isChainDependant(account: Partial<Account>): boolean {
  if (isVaultBaseAccount(account)) return false;

  return !isMultisigAccount(account) || Boolean(account.chainId);
}

function isChainIdMatch(account: Account, chainId: ChainId): boolean {
  if (!isChainDependant(account)) return true;

  const chainAccountMatch = isVaultChainAccount(account) && account.chainId === chainId;
  const shardAccountMatch = isVaultShardAccount(account) && account.chainId === chainId;
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

  return isWcAccount(account) || (account as VaultBaseAccount).cryptoType === cryptoType;
}

function isEthereumBased(account: Account): boolean {
  return account.cryptoType === CryptoType.ETHEREUM;
}

// Get specific accounts

function getMultisigAccountId(ids: AccountId[], threshold: MultisigThreshold, cryptoType: CryptoType): AccountId {
  const accountId = createKeyMulti(ids, threshold);
  const isEthereum = cryptoType === CryptoType.ETHEREUM;

  // TODO WTF
  return u8aToHex(isEthereum ? accountId.subarray(0, 20) : accountId) as AccountId;
}

function getAccountsAndShardGroups(accounts: Account[]): (VaultChainAccount | VaultShardAccount[])[] {
  const shardsIndexes: Record<string, number> = {};

  return accounts.reduce<(VaultChainAccount | VaultShardAccount[])[]>((acc, account) => {
    if (isVaultBaseAccount(account)) return acc;

    if (!isVaultShardAccount(account)) {
      // @ts-expect-error TODO fix
      acc.push(account);

      return acc;
    }

    const existingGroupIndex = shardsIndexes[(account as VaultShardAccount).groupId];
    if (existingGroupIndex !== undefined) {
      (acc[existingGroupIndex] as VaultShardAccount[]).push(account);
    } else {
      acc.push([account]);
      shardsIndexes[(account as VaultShardAccount).groupId] = acc.length - 1;
    }

    return acc;
  }, []);
}

function getBaseAccount(accounts: Account[], walletId?: ID): VaultBaseAccount | undefined {
  return accounts.find((a) => {
    const walletMatch = !walletId || walletId === a.walletId;

    return walletMatch && isVaultBaseAccount(a);
  }) as VaultBaseAccount;
}

function getSignatoryAccounts<T extends VaultBaseAccount>(accountIds: AccountId[], accounts: T[]): T[] {
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
  return account.proxyType === 'Any';
}

function isNonTransferProxyType(account: ProxiedAccount): boolean {
  return account.proxyType === 'NonTransfer';
}

function isStakingProxyType(account: ProxiedAccount): boolean {
  return account.proxyType === 'Staking';
}

function isGovernanceProxyType(account: ProxiedAccount): boolean {
  return account.proxyType === 'Governance';
}

function isNonBaseVaultAccount(account: Account, wallet: Wallet): boolean {
  return !walletUtils.isPolkadotVault(wallet) || !accountUtils.isVaultBaseAccount(account);
}

function getAddressesForWallet(wallet: Wallet, chain: Chain) {
  const matchedAccounts = walletUtils.getAccountsBy([wallet], (account) => {
    return accountUtils.isNonBaseVaultAccount(account, wallet) && isChainIdMatch(account, chain.chainId);
  });

  return matchedAccounts.map((a) => toAddress(a.accountId, { prefix: chain.addressPrefix }));
}
