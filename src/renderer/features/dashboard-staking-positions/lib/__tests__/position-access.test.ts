import { describe, expect, it } from 'vitest';

import { type ChainId, type Wallet, AccountType, CryptoType, SigningType, WalletType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { collectSignerAccountIds } from '@/features/signing-path';
import { type DraftPolicy, canAct, getMultisigThreshold, getPositionAccess } from '../position-access';

const accountId = (index: number): AccountId => toAccountId(`0x${index.toString(16).padStart(64, '0')}`);

const ALICE = accountId(1);
const BOB = accountId(2);
const CAROL = accountId(3);
const MULTISIG = accountId(4);
const PROXIED = accountId(5);
const CHAIN: ChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

/**
 * `Wallet.accounts` is typed as `AnyAccount & Record<string, any>`, which is
 * the escape hatch the app itself uses for the `accountType`-carrying subtypes.
 * Building fixtures through it keeps the tests free of casts.
 */
type AccountFixture = Wallet['accounts'][number];

function baseAccount(overrides: Record<string, unknown> = {}): AccountFixture {
  return {
    id: 'account',
    type: 'universal',
    name: 'Account',
    walletId: 1,
    accountId: ALICE,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    createdAt: 0,
    accountType: AccountType.BASE,
    ...overrides,
  };
}

function chainAccount(overrides: Record<string, unknown> = {}): AccountFixture {
  return {
    id: 'chain-account',
    type: 'chain',
    name: 'Account',
    walletId: 1,
    chainId: CHAIN,
    accountId: ALICE,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    createdAt: 0,
    accountType: AccountType.CHAIN,
    ...overrides,
  };
}

function multisigAccount(overrides: Record<string, unknown> = {}): AccountFixture {
  return baseAccount({
    id: 'multisig',
    accountId: MULTISIG,
    accountType: AccountType.MULTISIG,
    signingType: SigningType.MULTISIG,
    threshold: 2,
    signatories: [{ accountId: BOB }, { accountId: CAROL }],
    ...overrides,
  });
}

function makeWallet(id: number, type: WalletType, accounts: AccountFixture[]): Wallet {
  return { id, name: `Wallet ${id}`, type, accounts };
}

/**
 * The signer set the caller hands in. In the app it comes from the account
 * domain's list; here the fixture wallets are the whole world, so it is derived
 * from them.
 */
function signersOf(wallets: Wallet[]) {
  return collectSignerAccountIds(wallets.flatMap((wallet) => wallet.accounts));
}

/** Drafts are possible and every address could carry one — the happy policy. */
const DRAFTS_READY: DraftPolicy = { availability: 'ready', isDraftSource: () => true };

/**
 * `getPositionAccess` needs the row's address and chain even when there is no
 * local account for them, because whether a draft can start there is a fact
 * about the address on that network. The fixtures pass the account's own id
 * unless the case is specifically about an address we hold nothing for.
 */
function access(
  account: AccountFixture | null,
  wallets: Wallet[],
  policy: DraftPolicy = DRAFTS_READY,
  accountId: AccountId = account?.accountId ?? CAROL,
) {
  return getPositionAccess(account, accountId, CHAIN, wallets, signersOf(wallets), policy);
}

const DIRECT = { mode: 'direct', reason: null };
const MULTISIG_ACCESS = { mode: 'multisig', reason: null };
const DRAFT = { mode: 'draft', reason: null };

describe('getPositionAccess', () => {
  it('reports a signable local account as direct', () => {
    const account = baseAccount();
    const wallets = [makeWallet(1, WalletType.POLKADOT_VAULT, [account])];

    expect(access(account, wallets)).toEqual(DIRECT);
  });

  it('reports a watch-only wallet as watchOnly', () => {
    const account = baseAccount({
      accountType: AccountType.WATCH_ONLY,
      signingType: SigningType.WATCH_ONLY,
    });
    const wallets = [makeWallet(1, WalletType.WATCH_ONLY, [account])];

    expect(access(account, wallets)).toEqual({ mode: 'blocked', reason: 'watchOnly' });
  });

  it('reports a multisig with a local signatory as multisig', () => {
    const signatory = baseAccount({ id: 'signer', walletId: 2, accountId: BOB });
    const multisig = multisigAccount();

    const wallets = [
      makeWallet(1, WalletType.MULTISIG, [multisig]),
      makeWallet(2, WalletType.POLKADOT_VAULT, [signatory]),
    ];

    expect(access(multisig, wallets)).toEqual(MULTISIG_ACCESS);
  });

  it('reports a multisig without a local signatory as draft', () => {
    const multisig = multisigAccount();
    const wallets = [makeWallet(1, WalletType.MULTISIG, [multisig])];

    expect(access(multisig, wallets)).toEqual(DRAFT);
  });

  it('does not count a watch-only key as a signatory', () => {
    const watched = baseAccount({
      id: 'watched',
      walletId: 2,
      accountId: BOB,
      accountType: AccountType.WATCH_ONLY,
      signingType: SigningType.WATCH_ONLY,
    });
    const multisig = multisigAccount({ threshold: 1, signatories: [{ accountId: BOB }] });

    const wallets = [makeWallet(1, WalletType.MULTISIG, [multisig]), makeWallet(2, WalletType.WATCH_ONLY, [watched])];

    expect(access(multisig, wallets)).toEqual(DRAFT);
  });

  // The rule that decides this lives in the signing-path graph, and the graph
  // reads it off the account alone. A key stamped with a real signing type is
  // therefore a signer even if the wallet holding it is typed watch-only —
  // unreachable through today's pairing flow, but the dashboard must not be the
  // one to disagree: the graph would happily build a path through such a key,
  // so a `draft`/`watchOnly` verdict here would hide an action that works.
  it('judges a signing key by the account, not by its wallet type', () => {
    const signer = baseAccount({
      id: 'stray-signer',
      walletId: 2,
      accountId: BOB,
      signingType: SigningType.POLKADOT_VAULT,
    });
    const multisig = multisigAccount({ threshold: 1, signatories: [{ accountId: BOB }] });

    const wallets = [makeWallet(1, WalletType.MULTISIG, [multisig]), makeWallet(2, WalletType.WATCH_ONLY, [signer])];

    // As a signatory of someone else's multisig …
    expect(access(multisig, wallets)).toEqual(MULTISIG_ACCESS);
    // … and as a position of its own.
    expect(access(signer, wallets)).toEqual(DIRECT);
  });

  it('reports an address with no local account as draft', () => {
    expect(access(null, [])).toEqual(DRAFT);
  });

  it('lands an address-book position on draft, with its actions still offered', () => {
    // How a row is built: the position's accountId is looked up among the
    // installation's accounts, and an address that only exists in the address
    // book misses. The row must still offer its actions — they leave as drafts.
    const wallets = [makeWallet(1, WalletType.POLKADOT_VAULT, [baseAccount()])];
    const rowAccount = wallets.flatMap((w) => w.accounts).find((a) => a.accountId === CAROL) ?? null;

    expect(rowAccount).toBeNull();

    const verdict = access(rowAccount, wallets, DRAFTS_READY, CAROL);

    expect(verdict).toEqual(DRAFT);
    expect(canAct(verdict)).toBe(true);
  });

  describe('when a draft is the only way through', () => {
    const NO_ROUTE: DraftPolicy = { availability: 'ready', isDraftSource: () => false };

    it('blocks an address the signing-path graph cannot route from', () => {
      // A plain contact — no multisig, no proxy. Nothing about the address book
      // or the user's permissions can make it a draft source, so this reason
      // outranks the other two: telling the user to connect or to ask an admin
      // would send them after a fix that changes nothing.
      expect(access(null, [], NO_ROUTE)).toEqual({ mode: 'blocked', reason: 'noDraftRoute' });
    });

    it('blocks when no external address book was ever connected', () => {
      const policy: DraftPolicy = { availability: 'notConnected', isDraftSource: () => true };

      expect(access(null, [], policy)).toEqual({ mode: 'blocked', reason: 'draftsNotConnected' });
    });

    it('blocks when the user may not create drafts', () => {
      const policy: DraftPolicy = { availability: 'noPermission', isDraftSource: () => true };

      expect(access(null, [], policy)).toEqual({ mode: 'blocked', reason: 'draftsNoPermission' });
    });

    it('still offers the draft while the address book is merely unreachable', () => {
      // Recoverable: the draft card carries its own reconnect prompt, and
      // refusing here would hide the one control that fixes it.
      const policy: DraftPolicy = { availability: 'offline', isDraftSource: () => true };

      expect(access(null, [], policy)).toEqual(DRAFT);
    });

    it('blocks a foreign multisig the same way as a bare address', () => {
      const multisig = multisigAccount();
      const wallets = [makeWallet(1, WalletType.MULTISIG, [multisig])];

      expect(access(multisig, wallets, NO_ROUTE)).toEqual({ mode: 'blocked', reason: 'noDraftRoute' });
    });

    it('never offers a draft for a watch-only account of ours', () => {
      // It is one of ours, so there is nobody to hand it to — no permission and
      // no connection would change that, and the reason has to say so.
      const account = baseAccount({
        accountType: AccountType.WATCH_ONLY,
        signingType: SigningType.WATCH_ONLY,
      });
      const wallets = [makeWallet(1, WalletType.WATCH_ONLY, [account])];

      expect(access(account, wallets, { availability: 'ready', isDraftSource: () => true })).toEqual({
        mode: 'blocked',
        reason: 'watchOnly',
      });
    });

    it('asks the draft rule about the row’s own address and chain', () => {
      const seen: [AccountId, ChainId][] = [];
      const policy: DraftPolicy = {
        availability: 'ready',
        isDraftSource: (id, chainId) => {
          seen.push([id, chainId]);

          return true;
        },
      };

      access(null, [], policy, CAROL);

      expect(seen).toEqual([[CAROL, CHAIN]]);
    });
  });

  it('reports a contact multisig (sentinel wallet id) as draft', () => {
    const contactMultisig = multisigAccount({ walletId: -1 });
    const wallets = [makeWallet(2, WalletType.POLKADOT_VAULT, [baseAccount({ walletId: 2, accountId: BOB })])];

    expect(access(contactMultisig, wallets)).toEqual(DRAFT);
  });

  it('follows the proxy: a proxied account is direct only when the proxy is local', () => {
    const proxy = baseAccount({ id: 'proxy', walletId: 2, accountId: BOB });
    const proxied = chainAccount({
      id: 'proxied',
      accountId: PROXIED,
      accountType: AccountType.PROXIED,
      // Every creation site stamps a proxied account WATCH_ONLY — it holds no
      // key of its own, the proxy does. `features/proxies/model/proxies-model.ts`,
      // `features/account-sync/model/sync.ts`, and the synthetic account built by
      // `features/signing-path/lib/path-account-resolution.ts` all agree on this.
      signingType: SigningType.WATCH_ONLY,
      connections: [{ proxyAccountId: BOB, delay: 0, proxyType: 'Any' }],
    });

    const withProxy = [makeWallet(1, WalletType.PROXIED, [proxied]), makeWallet(2, WalletType.POLKADOT_VAULT, [proxy])];
    const withoutProxy = [makeWallet(1, WalletType.PROXIED, [proxied])];

    expect(access(proxied, withProxy)).toEqual(DIRECT);
    expect(access(proxied, withoutProxy)).toEqual(DRAFT);
  });
});

describe('getMultisigThreshold', () => {
  it('reads the threshold off a multisig account', () => {
    const multisig = multisigAccount({
      threshold: 2,
      signatories: [{ accountId: ALICE }, { accountId: BOB }, { accountId: CAROL }],
    });

    expect(getMultisigThreshold(multisig)).toEqual({ threshold: 2, signatories: 3 });
  });

  it('returns null for anything else', () => {
    expect(getMultisigThreshold(baseAccount())).toBeNull();
    expect(getMultisigThreshold(null)).toBeNull();
  });
});
