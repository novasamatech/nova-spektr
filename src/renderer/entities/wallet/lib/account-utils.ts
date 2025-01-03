import { u8aToHex } from '@polkadot/util';
import { createKeyMulti } from '@polkadot/util-crypto';
import keyBy from 'lodash/keyBy';

// TODO: resolve cross import
import {
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
  type WatchOnlyAccount,
  type WcAccount,
} from '@/shared/core';
import { AccountType, CryptoType, ProxyVariant } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
// TODO all this type checks should be defined in features with own context
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount, type AnyAccountDraft, accountsService } from '@/domains/network';
import { networkUtils } from '@/entities/network';

import { walletUtils } from './wallet-utils';

export const accountUtils = {
  isWatchOnlyAccount,
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

function isWatchOnlyAccount(account: Partial<AnyAccount>): account is WatchOnlyAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    accountsService.isUniversalAccount(account) &&
    'accountType' in account &&
    account.accountType === AccountType.WATCH_ONLY
  );
}

function isVaultBaseAccount(account: Partial<AnyAccount>): account is VaultBaseAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    accountsService.isUniversalAccount(account) && 'accountType' in account && account.accountType === AccountType.BASE
  );
}

function isVaultChainAccount(account: Partial<AnyAccount>): account is VaultChainAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    accountsService.isChainAccount(account) && 'accountType' in account && account.accountType === AccountType.CHAIN
  );
}

function isWcAccount(account: Partial<AnyAccount>): account is WcAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    accountsService.isChainAccount(account) &&
    'accountType' in account &&
    account.accountType === AccountType.WALLET_CONNECT
  );
}

function isVaultShardAccount(account: Partial<AnyAccount>): account is VaultShardAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    accountsService.isChainAccount(account) && 'accountType' in account && account.accountType === AccountType.SHARD
  );
}

function isRegularMultisigAccount(account: Partial<AnyAccount>): account is MultisigAccount {
  return 'accountType' in account && account.accountType === AccountType.MULTISIG;
}

function isFlexibleMultisigAccount(account: Partial<AnyAccount>): account is FlexibleMultisigAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    accountsService.isChainAccount(account) &&
    'accountType' in account &&
    account.accountType === AccountType.FLEXIBLE_MULTISIG
  );
}

function isMultisigAccount(account: Partial<AnyAccount>): account is MultisigAccount | FlexibleMultisigAccount {
  return isFlexibleMultisigAccount(account) || isRegularMultisigAccount(account);
}

function isProxiedAccount(account: Partial<AnyAccount>): account is ProxiedAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    accountsService.isChainAccount(account) && 'accountType' in account && account.accountType === AccountType.PROXIED
  );
}

function isPureProxiedAccount(account: Partial<AnyAccount>): account is ProxiedAccount {
  return isProxiedAccount(account) && account.proxyVariant === ProxyVariant.PURE;
}

// Matchers

function isAccountWithShards(accounts: AnyAccount | VaultShardAccount[]): accounts is VaultShardAccount[] {
  return Array.isArray(accounts) && isVaultShardAccount(accounts[0]);
}

function isChainDependant(account: AnyAccountDraft): boolean {
  if (accountsService.isUniversalAccount(account)) return false;

  return !isMultisigAccount(account) || Boolean(account.chainId);
}

function isChainIdMatch(account: AnyAccount, chainId: ChainId): boolean {
  if (!isChainDependant(account)) return true;

  const chainAccountMatch = isVaultChainAccount(account) && account.chainId === chainId;
  const shardAccountMatch = isVaultShardAccount(account) && account.chainId === chainId;
  const wcAccountMatch = isWcAccount(account) && account.chainId === chainId;
  const proxiedAccountMatch = isProxiedAccount(account) && account.chainId === chainId;
  const multisigWalletMatch = isMultisigAccount(account) && account.chainId === chainId;

  return chainAccountMatch || wcAccountMatch || shardAccountMatch || proxiedAccountMatch || multisigWalletMatch;
}

function isChainAndCryptoMatch(account: AnyAccount, chain: Chain): boolean {
  return isChainDependant(account) ? isChainIdMatch(account, chain.chainId) : isCryptoTypeMatch(account, chain);
}

function isCryptoTypeMatch(account: AnyAccount, chain: Chain): boolean {
  const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;

  return isWcAccount(account) || account.cryptoType === cryptoType;
}

function isEthereumBased(account: AnyAccount): boolean {
  return account.cryptoType === CryptoType.ETHEREUM;
}

// Get specific accounts

function getMultisigAccountId(ids: AccountId[], threshold: MultisigThreshold, cryptoType: CryptoType): AccountId {
  const accountId = createKeyMulti(ids, threshold);
  const isEthereum = cryptoType === CryptoType.ETHEREUM;

  // TODO WTF
  return u8aToHex(isEthereum ? accountId.subarray(0, 20) : accountId) as AccountId;
}

function getAccountsAndShardGroups(accounts: AnyAccount[]): (VaultChainAccount | VaultShardAccount[])[] {
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

function getBaseAccount(accounts: AnyAccount[], walletId?: ID): VaultBaseAccount | undefined {
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

/**
 * @deprecated This predicate exists only because both "watch only" and PV
 *   "root" accounts implemented with BaseAccount interface. After introducing
 *   `WatchOnly` account type this check can be reduced to
 *   `!accountUtils.isVaultBaseAccount(account)`.
 */
function isNonBaseVaultAccount(account: AnyAccount, wallet: Wallet): boolean {
  return !walletUtils.isPolkadotVault(wallet) || !accountUtils.isVaultBaseAccount(account);
}

function getAddressesForWallet(wallet: Wallet, chain: Chain) {
  const matchedAccounts = walletUtils.getAccountsBy([wallet], (account) => {
    return accountUtils.isNonBaseVaultAccount(account, wallet) && isChainIdMatch(account, chain.chainId);
  });

  return matchedAccounts.map((a) => toAddress(a.accountId, { prefix: chain.addressPrefix }));
}
