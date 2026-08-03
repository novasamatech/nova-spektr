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

const makeMultisigAccount = (
  accountId: AccountId,
  walletId: number,
  signatories: AccountId[],
  threshold: number,
): AnyAccount =>
  ({
    id: `multi-${accountId}`,
    type: 'universal',
    walletId,
    name: 'multisig',
    accountId,
    accountType: AccountType.MULTISIG,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.MULTISIG,
    signatories: signatories.map((sigId) => ({ accountId: sigId })),
    threshold,
    createdAt: 0,
  }) as unknown as AnyAccount;

const makeFlexibleMultisigAccount = (
  accountId: AccountId,
  multisigAccountId: AccountId,
  walletId: number,
  signatories: AccountId[],
  threshold: number,
): AnyAccount =>
  ({
    id: `flex-${accountId}`,
    type: 'chain',
    walletId,
    name: 'flexible multisig',
    accountId,
    accountType: AccountType.FLEX_MULTISIG,
    chainId: '0xaaaa',
    multisigAccountId,
    signatories: signatories.map((sigId) => ({ accountId: sigId })),
    threshold,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.MULTISIG,
    createdAt: 0,
  }) as unknown as AnyAccount;

const makeWallets = (accounts: AnyAccount[]): Wallet[] =>
  accounts.map((account) => ({
    id: account.walletId,
    type: WalletType.POLKADOT_VAULT,
    accounts: [account],
  })) as unknown as Wallet[];

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

  // The empty path is legal — it means a regular account signing for itself,
  // so nothing gets wrapped.
  it('builds no wrappers for an empty path', () => {
    const account = makeAccount(acc(1), 1);

    const wrappers = pathToTxWrappers([], [account], makeWallets([account]));

    expect(wrappers).toEqual([]);
  });

  it('builds a single asMulti wrapper for multisig → signer', () => {
    const multisigId = acc(1);
    const sig1 = acc(2);
    const sig2 = acc(3);
    const multisig = makeMultisigAccount(multisigId, 1, [sig1, sig2], 2);
    const signer = makeAccount(sig1, 2);
    const otherSignatory = makeAccount(sig2, 3);
    const allAccounts = [multisig, signer, otherSignatory];
    const path: PathNode[] = [
      { kind: 'multisig', accountId: multisigId },
      { kind: 'signer', accountId: sig1 },
    ];

    const wrappers = pathToTxWrappers(path, allAccounts, makeWallets(allAccounts));

    expect(wrappers).toHaveLength(1);
    expect(wrappers[0]).toMatchObject({
      kind: WrapperKind.MULTISIG,
      multisigAccount: { accountId: multisigId, threshold: 2 },
      signer: { accountId: sig1 },
      // Every wallet-known signatory is collected, the signer included — the
      // "other signatories" exclusion happens downstream, when the wrap code
      // derives asMulti args (multisigOperationService.getOtherSignatories).
      signatories: [{ accountId: sig1 }, { accountId: sig2 }],
    });
  });

  it('nests an asMulti wrapper around the proxy wrapper for proxied → multisig → signer', () => {
    const proxiedId = acc(1);
    const multisigId = acc(2);
    const signerId = acc(3);
    const proxied = makeProxiedAccount(proxiedId, multisigId);
    const multisig = makeMultisigAccount(multisigId, 2, [signerId], 1);
    const signer = makeAccount(signerId, 3);
    const allAccounts = [proxied, multisig, signer];
    const path: PathNode[] = [
      { kind: 'proxied', accountId: proxiedId, proxyType: 'Any' },
      { kind: 'multisig', accountId: multisigId },
      { kind: 'signer', accountId: signerId },
    ];

    const wrappers = pathToTxWrappers(path, allAccounts, makeWallets(allAccounts));

    // Wrappers come out in path order: wrapper[i] is executed by the account at
    // hop i+1. The proxy.proxy call sits first and its executor is the multisig
    // — i.e. the asMulti wrapper that follows wraps the proxy call.
    expect(wrappers).toHaveLength(2);
    expect(wrappers[0]).toMatchObject({
      kind: WrapperKind.PROXY,
      proxiedAccount: {
        accountId: proxiedId,
        connections: [{ proxyAccountId: multisigId, proxyType: 'Any', delay: 0 }],
      },
      proxyAccount: { accountId: multisigId },
    });
    expect(wrappers[1]).toMatchObject({
      kind: WrapperKind.MULTISIG,
      multisigAccount: { accountId: multisigId, threshold: 1 },
      signer: { accountId: signerId },
    });
  });

  // The grammar allows a multisig as a signatory of another multisig
  // (path-validation: "accepts multisig -> nested-multisig -> signer").
  it('builds nested asMulti wrappers for multisig → multisig → signer', () => {
    const outerId = acc(1);
    const innerId = acc(2);
    const signerId = acc(3);
    const externalId = acc(4); // outer signatory the user does not own
    const outer = makeMultisigAccount(outerId, 1, [innerId, externalId], 2);
    const inner = makeMultisigAccount(innerId, 2, [signerId], 1);
    const signer = makeAccount(signerId, 3);
    const allAccounts = [outer, inner, signer];
    const path: PathNode[] = [
      { kind: 'multisig', accountId: outerId },
      { kind: 'multisig', accountId: innerId },
      { kind: 'signer', accountId: signerId },
    ];

    const wrappers = pathToTxWrappers(path, allAccounts, makeWallets(allAccounts));

    expect(wrappers).toHaveLength(2);
    // Outer asMulti is signed by the inner multisig account…
    expect(wrappers[0]).toMatchObject({
      kind: WrapperKind.MULTISIG,
      multisigAccount: { accountId: outerId, threshold: 2 },
      signer: { accountId: innerId },
      // externalId has no wallet account, so only the inner multisig survives
      signatories: [{ accountId: innerId }],
    });
    // …whose own asMulti is signed by the leaf signer.
    expect(wrappers[1]).toMatchObject({
      kind: WrapperKind.MULTISIG,
      multisigAccount: { accountId: innerId, threshold: 1 },
      signer: { accountId: signerId },
    });
  });

  // README special case: a flexible multisig enters the path as `proxied`
  // (its facade is a pure proxy over an inner multisig), and the multisig hop
  // behind it collapses into a SINGLE multisig wrapper — never proxy+multisig.
  it('collapses a flexible multisig into a single asMulti wrapper', () => {
    const flexId = acc(1); // facade (proxied) accountId
    const innerMultisigId = acc(2); // inner multisig accountId
    const sig1 = acc(3);
    const sig2 = acc(4);
    const flex = makeFlexibleMultisigAccount(flexId, innerMultisigId, 1, [sig1, sig2], 2);
    // The inner multisig address exists as a plain account too — the proxied
    // hop must still be skipped via the explicit flex-facade check.
    const innerAddress = makeAccount(innerMultisigId, 2);
    const signer = makeAccount(sig1, 3);
    const otherSignatory = makeAccount(sig2, 4);
    const allAccounts = [flex, innerAddress, signer, otherSignatory];
    const path: PathNode[] = [
      { kind: 'proxied', accountId: flexId },
      { kind: 'multisig', accountId: innerMultisigId },
      { kind: 'signer', accountId: sig1 },
    ];

    const wrappers = pathToTxWrappers(path, allAccounts, makeWallets(allAccounts));

    expect(wrappers).toHaveLength(1);
    expect(wrappers[0]).toMatchObject({
      kind: WrapperKind.MULTISIG,
      // The wrapper carries the flex account itself (resolved through its
      // multisigAccountId), with the facade's signatories and threshold.
      multisigAccount: { accountId: flexId, multisigAccountId: innerMultisigId, threshold: 2 },
      signatories: [{ accountId: sig1 }, { accountId: sig2 }],
      signer: { accountId: sig1 },
    });
  });

  it('collapses a flexible multisig even when the inner multisig address is not a known account', () => {
    const flexId = acc(1);
    const innerMultisigId = acc(2);
    const signerId = acc(3);
    const flex = makeFlexibleMultisigAccount(flexId, innerMultisigId, 1, [signerId], 1);
    const signer = makeAccount(signerId, 2);
    const allAccounts = [flex, signer];
    const path: PathNode[] = [
      { kind: 'proxied', accountId: flexId },
      { kind: 'multisig', accountId: innerMultisigId },
      { kind: 'signer', accountId: signerId },
    ];

    const wrappers = pathToTxWrappers(path, allAccounts, makeWallets(allAccounts));

    expect(wrappers).toHaveLength(1);
    expect(wrappers[0]).toMatchObject({
      kind: WrapperKind.MULTISIG,
      multisigAccount: { accountId: flexId, multisigAccountId: innerMultisigId },
      signer: { accountId: signerId },
    });
  });

  it('keeps only wallet-known signatories on the multisig wrapper', () => {
    const multisigId = acc(1);
    const sig1 = acc(2);
    const sig2 = acc(3);
    const externalSig = acc(4); // signatory with no wallet account
    const multisig = makeMultisigAccount(multisigId, 1, [sig1, sig2, externalSig], 2);
    const signer = makeAccount(sig1, 2);
    const otherSignatory = makeAccount(sig2, 3);
    const allAccounts = [multisig, signer, otherSignatory];
    const path: PathNode[] = [
      { kind: 'multisig', accountId: multisigId },
      { kind: 'signer', accountId: sig1 },
    ];

    const wrappers = pathToTxWrappers(path, allAccounts, makeWallets(allAccounts));

    expect(wrappers).toHaveLength(1);
    expect(wrappers[0]).toMatchObject({
      signatories: [{ accountId: sig1 }, { accountId: sig2 }],
    });
  });
});
