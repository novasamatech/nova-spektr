import {
  type ChainId,
  type ProxiedAccount,
  type ProxyType,
  AccountType,
  CryptoType,
  ProxyTypes,
  ProxyVariant,
  SigningType,
} from '@/shared/core';
import { isEthereumAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

const SYNTHETIC_PROXY_WALLET_ID = -1;

type CreateSyntheticProxiedAccountParams = {
  accountId: AccountId;
  chainId: ChainId;
  baseAccount?: AnyAccount | null;
  id?: string;
  name?: string;
  proxyAccountId?: AccountId;
  proxyType?: string;
};

export function createSyntheticProxiedAccount({
  accountId,
  chainId,
  baseAccount,
  id,
  name,
  proxyAccountId,
  proxyType,
}: CreateSyntheticProxiedAccountParams): ProxiedAccount {
  const connection = proxyAccountId
    ? [{ proxyAccountId, proxyType: (proxyType ?? ProxyTypes.ANY) as ProxyType, delay: 0 }]
    : [];

  return {
    id: id ?? `synthetic-proxied:${chainId}:${accountId}:${proxyAccountId ?? 'none'}`,
    type: 'chain',
    walletId: baseAccount?.walletId ?? SYNTHETIC_PROXY_WALLET_ID,
    name: name ?? baseAccount?.name ?? '',
    accountId,
    chainId,
    accountType: AccountType.PROXIED,
    cryptoType: baseAccount?.cryptoType ?? (isEthereumAccountId(accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519),
    signingType: baseAccount?.signingType ?? SigningType.WATCH_ONLY,
    connections: connection,
    proxyVariant: ProxyVariant.REGULAR,
    deposit: '0',
    extrinsicIndex: 0,
    entropyBlockNumber: 0,
    createdAt: baseAccount?.createdAt ?? 0,
  };
}

export function scopeProxiedAccount(
  account: AnyAccount,
  proxyAccountId: AccountId | undefined,
  proxyType: string | undefined,
): AnyAccount {
  if (!proxyType || !proxyAccountId || !accountUtils.isProxiedAccount(account)) {
    return account;
  }

  const connections = account.connections.filter(
    (connection) => connection.proxyAccountId === proxyAccountId && connection.proxyType === proxyType,
  );

  return {
    ...account,
    connections: connections.length > 0 ? connections : [{ proxyAccountId, proxyType: proxyType as never, delay: 0 }],
  } as AnyAccount;
}
