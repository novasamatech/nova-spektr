import { describe, expect, it } from 'vitest';

import { type Wallet, AccountType, CryptoType, SigningType, WalletType, WrapperKind } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount } from '@/domains/network';

import { pathToTxWrappers } from './pathToTxWrappers';

const acc = (n: number): AccountId => `1${'0'.repeat(46)}${n}`.slice(0, 48) as AccountId;

const makeProxiedAccount = (accountId: AccountId, proxyAccountId: AccountId): AnyAccount =>
  ({
    id: `proxied-${accountId}`,
    type: 'chain',
    walletId: 1,
    name: 'proxied',
    accountId,
    accountType: AccountType.PROXIED,
    chainId: '0xaaaa',
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.WATCH_ONLY,
    connections: [
      { proxyAccountId, proxyType: 'Any', delay: 0 },
      { proxyAccountId, proxyType: 'Governance', delay: 0 },
    ],
    createdAt: 0,
  }) as unknown as AnyAccount;

const makeAccount = (accountId: AccountId, walletId: number): AnyAccount =>
  ({
    id: `acct-${accountId}`,
    type: 'universal',
    walletId,
    name: 'account',
    accountId,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    createdAt: 0,
  }) as unknown as AnyAccount;

describe('pathToTxWrappers', () => {
  it('scopes proxy wrappers to the selected proxy type', () => {
    const proxiedId = acc(1);
    const proxyId = acc(2);
    const signerId = acc(3);
    const proxied = makeProxiedAccount(proxiedId, proxyId);
    const proxy = makeAccount(proxyId, 2);
    const signer = makeAccount(signerId, 3);
    const path: PathNode[] = [
      { kind: 'proxied', accountId: proxiedId, proxyType: 'Governance' },
      { kind: 'signer', accountId: proxyId },
    ];
    const wallets = [
      { id: 1, type: WalletType.PROXIED, accounts: [proxied] },
      { id: 2, type: WalletType.WATCH_ONLY, accounts: [proxy] },
      { id: 3, type: WalletType.WATCH_ONLY, accounts: [signer] },
    ] as unknown as Wallet[];

    const wrappers = pathToTxWrappers(path, [proxied, proxy, signer], wallets);

    expect(wrappers).toHaveLength(1);
    expect(wrappers[0]).toMatchObject({
      kind: WrapperKind.PROXY,
      proxiedAccount: {
        connections: [{ proxyAccountId: proxyId, proxyType: 'Governance', delay: 0 }],
      },
    });
  });
});
