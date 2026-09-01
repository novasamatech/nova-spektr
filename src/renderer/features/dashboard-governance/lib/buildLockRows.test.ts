import { BN, BN_ZERO } from '@polkadot/util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type Wallet, SigningType, WalletType } from '@/shared/core';
import { createAccountId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { type AnyAccount, accountService } from '@/domains/network';

import { type LockRowsSource, buildLockRows, compareLockRows } from './buildLockRows';
import { type AccountLockSummary } from './summarizeAccountLocks';

const DAY_MS = 86_400_000;
const BLOCK_TIME_MS = 6_000;
const BLOCKS_PER_DAY = DAY_MS / BLOCK_TIME_MS;

const lockedId = createAccountId('locked');
const contactId = createAccountId('contact');

const wallet: Wallet = { id: 1, name: 'Vault', type: WalletType.POLKADOT_VAULT, accounts: [] };

const signer: AnyAccount = {
  id: 'signer',
  type: 'universal',
  name: '',
  walletId: wallet.id,
  accountId: lockedId,
  cryptoType: 0,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
};

const summary = (overrides: Partial<AccountLockSummary> = {}): AccountLockSummary => ({
  maxLock: new BN(100),
  claimable: BN_ZERO,
  claimableActions: [],
  pending: BN_ZERO,
  nextUnlockBlock: null,
  delegated: BN_ZERO,
  tracks: [],
  ...overrides,
});

const source = (locksByAccount: Record<string, AccountLockSummary>, overrides: Partial<LockRowsSource> = {}) =>
  ({
    chainId: polkadotChainId,
    chainName: 'Polkadot',
    symbol: 'DOT',
    precision: 10,
    icon: { colored: 'dot.svg' },
    priceId: 'polkadot',
    blockTimeMs: BLOCK_TIME_MS,
    currentBlock: 1_000,
    locksByAccount,
    ...overrides,
  }) satisfies LockRowsSource;

const NOW = 1_700_000_000_000;

const build = (data: LockRowsSource | null, extra: Partial<Parameters<typeof buildLockRows>[0]> = {}) =>
  buildLockRows({
    data,
    chain: polkadotChain,
    allAccounts: [signer],
    wallets: [wallet],
    toFiat: null,
    now: NOW,
    ...extra,
  });

describe('buildLockRows', () => {
  beforeEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.registerHandler({ body: () => true, available: () => true });
    accountService.accountActionPermissionAnyOf.registerHandler({
      body: ({ account }) => account.signingType !== SigningType.WATCH_ONLY,
      available: () => true,
    });
  });

  afterEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
    accountService.accountActionPermissionAnyOf.resetHandlers();
  });

  it('returns nothing without chain data or a chain', () => {
    expect(build(null)).toEqual([]);
    expect(build(source({ [lockedId]: summary() }), { chain: undefined })).toEqual([]);
  });

  it('leaves out an account whose lock folded to zero', () => {
    const rows = build(source({ [lockedId]: summary({ maxLock: BN_ZERO }), [contactId]: summary() }));

    expect(rows.map((row) => row.accountId)).toEqual([contactId]);
  });

  it('keeps a row whose only lock is a stale class lock — the permissionless release case', () => {
    // No votes left, so the votes' max is zero; `getLockedAmount` carried the
    // class lock into `maxLock`, and the claimable `unlock` must stay visible.
    const rows = build(
      source({
        [lockedId]: summary({
          maxLock: new BN(100),
          claimable: new BN(100),
          claimableActions: [{ type: 'unlock', trackId: '0' }],
        }),
      }),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.claimable.toString()).toBe('100');
    expect(rows[0]?.initiator).toBe(signer);
  });

  it('resolves the signer and its wallet for a local key, none for a contact', () => {
    const [local, contact] = build(source({ [lockedId]: summary(), [contactId]: summary() }));

    expect(local?.initiator).toBe(signer);
    expect(local?.wallet).toBe(wallet);
    expect(local?.target).toBe(lockedId);
    expect(local?.blockReason).toBeNull();

    expect(contact?.initiator).toBeNull();
    expect(contact?.wallet).toBeNull();
    expect(contact?.blockReason).toBe('no-local-account');
  });

  it('estimates the next release from the block distance and block time', () => {
    const [row] = build(
      source({
        [lockedId]: summary({ pending: new BN(50), nextUnlockBlock: 1_000 + 2 * BLOCKS_PER_DAY }),
      }),
    );

    expect(row?.nextUnlockAtMs).toBe(NOW + 2 * DAY_MS);
    expect(row?.daysUntilNextUnlock).toBe(2);
  });

  it('floors a release already due at zero days rather than a negative count', () => {
    const [row] = build(source({ [lockedId]: summary({ pending: new BN(50), nextUnlockBlock: 400 }) }));

    expect(row?.daysUntilNextUnlock).toBe(0);
  });

  it('has no release estimate without block time or a current block', () => {
    const locks = { [lockedId]: summary({ pending: new BN(50), nextUnlockBlock: 2_000 }) };

    for (const overrides of [{ blockTimeMs: null }, { currentBlock: null }]) {
      const [row] = build(source(locks, overrides));

      expect(row?.nextUnlockAtMs).toBeNull();
      expect(row?.daysUntilNextUnlock).toBeNull();
    }
  });

  it('prices only the non-zero figures, and nothing when fiat is off', () => {
    const locks = {
      [lockedId]: summary({ maxLock: new BN(100), claimable: new BN(40), delegated: BN_ZERO }),
    };
    const toFiat = (amount: string) => `$${amount}`;

    const [priced] = build(source(locks), { toFiat });
    expect(priced?.lockedFiat).toBe('$100');
    expect(priced?.claimableFiat).toBe('$40');
    expect(priced?.delegatedFiat).toBeNull();

    const [unpriced] = build(source(locks));
    expect(unpriced?.lockedFiat).toBeNull();
    expect(unpriced?.claimableFiat).toBeNull();
  });

  it('keys the row by chain and account and exposes plain sort numbers', () => {
    const [row] = build(source({ [lockedId]: summary({ maxLock: new BN(123), claimable: new BN(45) }) }));

    expect(row?.key).toBe(`${polkadotChainId}:${lockedId}`);
    expect(row?.lockedNum).toBe(123);
    expect(row?.claimableNum).toBe(45);
    expect(row?.chainIcon).toBe('dot.svg');
  });
});

describe('compareLockRows', () => {
  it('sorts by claimable, then by locked, descending', () => {
    const rows = build(
      source({
        [createAccountId('a')]: summary({ maxLock: new BN(500), claimable: BN_ZERO }),
        [createAccountId('b')]: summary({ maxLock: new BN(100), claimable: new BN(10) }),
        [createAccountId('c')]: summary({ maxLock: new BN(200), claimable: new BN(10) }),
      }),
    ).sort(compareLockRows);

    expect(rows.map((row) => `${row.claimable}/${row.locked}`)).toEqual(['10/200', '10/100', '0/500']);
  });
});
