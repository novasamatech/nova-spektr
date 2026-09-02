import { afterEach, describe, expect, it } from 'vitest';

import { type ClaimAction } from '@/shared/api/governance';
import { type WatchOnlyAccount, AccountType, CryptoType, SigningType } from '@/shared/core';
import { createAccountId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { type ChainAccount, accountService } from '@/domains/network';

import { resolveUnlockAccount } from './resolveUnlockAccount';

const lockedId = createAccountId('1');
const payerId = createAccountId('2');

const chainAccount = (overrides: Partial<ChainAccount> & Pick<ChainAccount, 'id'>): ChainAccount => ({
  type: 'chain',
  name: '',
  walletId: 1,
  chainId: polkadotChainId,
  accountId: lockedId,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
  ...overrides,
});

// Mirrors the watch-only fixture from aggregates/vesting-portfolio/lib/resolveClaimAccount.test.ts
const watchOnly = (): WatchOnlyAccount => ({
  id: 'watch-only',
  type: 'universal',
  name: '',
  walletId: 4,
  accountId: lockedId,
  accountType: AccountType.WATCH_ONLY,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.WATCH_ONLY,
  createdAt: 0,
});

const UNLOCK: ClaimAction[] = [{ type: 'unlock', trackId: '0' }];
const REMOVE: ClaimAction[] = [{ type: 'remove_vote', trackId: '0', referendumId: '1' }];
const UNDELEGATE: ClaimAction[] = [
  { type: 'undelegate', trackId: '0' },
  { type: 'unlock', trackId: '0' },
];

/**
 * Mirrors resolveClaimAccount.test.ts: these DI pipelines have no default
 * handler.
 */
const registerHandlers = () => {
  accountService.accountAvailabilityOnChainAnyOf.registerHandler({
    body: () => true,
    available: () => true,
  });
  accountService.accountActionPermissionAnyOf.registerHandler({
    body: ({ account }) => account.signingType !== SigningType.WATCH_ONLY,
    available: () => true,
  });
};

describe('resolveUnlockAccount', () => {
  afterEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
    accountService.accountActionPermissionAnyOf.resetHandlers();
    accountService.accountCanSignMultipleAnyOf.resetHandlers();
    accountService.accountCollectChildrenPipeline.resetHandlers();
  });

  it('lets a signable local account release its own lock', () => {
    registerHandlers();

    const signer = chainAccount({ id: 'a' });

    const result = resolveUnlockAccount({
      lockedAccountId: lockedId,
      candidates: [signer],
      chain: polkadotChain,
      allAccounts: [signer],
      actions: REMOVE,
    });

    expect(result).toEqual({ initiator: signer, target: lockedId, reason: null });
  });

  it('reports a contact with no local account', () => {
    registerHandlers();

    const result = resolveUnlockAccount({
      lockedAccountId: lockedId,
      candidates: [],
      chain: polkadotChain,
      allAccounts: [],
      actions: REMOVE,
    });

    expect(result.initiator).toBeNull();
    expect(result.reason).toBe('no-local-account');
  });

  it('blocks a watch-only account when a remove_vote is required', () => {
    registerHandlers();

    const payer = chainAccount({ id: 'p', accountId: payerId, walletId: 2 });

    const result = resolveUnlockAccount({
      lockedAccountId: lockedId,
      candidates: [watchOnly()],
      chain: polkadotChain,
      allAccounts: [watchOnly(), payer],
      actions: REMOVE,
    });

    expect(result.initiator).toBeNull();
    expect(result.reason).toBe('watch-only');
  });

  it('releases a watch-only account permissionlessly through a local payer when every action is unlock', () => {
    registerHandlers();

    const payer = chainAccount({ id: 'p', accountId: payerId, walletId: 2 });

    const result = resolveUnlockAccount({
      lockedAccountId: lockedId,
      candidates: [watchOnly()],
      chain: polkadotChain,
      allAccounts: [watchOnly(), payer],
      actions: UNLOCK,
    });

    expect(result.initiator).toBe(payer);
    expect(result.target).toBe(lockedId);
    expect(result.reason).toBeNull();
  });

  it('never lets a payer undelegate for somebody else', () => {
    registerHandlers();

    const payer = chainAccount({ id: 'payer', accountId: payerId });

    const result = resolveUnlockAccount({
      lockedAccountId: lockedId,
      candidates: [watchOnly()],
      chain: polkadotChain,
      allAccounts: [watchOnly(), payer],
      actions: UNDELEGATE,
    });

    expect(result).toEqual({ initiator: null, target: lockedId, reason: 'watch-only' });
  });

  it('drops the permissionless payer once a remove_vote joins the actions', () => {
    registerHandlers();

    const payer = chainAccount({ id: 'p', accountId: payerId, walletId: 2 });
    const params = {
      lockedAccountId: lockedId,
      candidates: [watchOnly()],
      chain: polkadotChain,
      allAccounts: [watchOnly(), payer],
    };

    // The snapshot said unlock-only, so a payer could release it for free.
    expect(resolveUnlockAccount({ ...params, actions: UNLOCK }).initiator).toBe(payer);

    // A referendum that ended since adds an origin-bound remove_vote: the payer
    // may no longer send it, which is why the initiator is re-resolved against
    // the fresh actions at the moment of the click.
    const fresh = resolveUnlockAccount({ ...params, actions: [...UNLOCK, ...REMOVE] });

    expect(fresh.initiator).toBeNull();
    expect(fresh.reason).toBe('watch-only');
  });

  it('prefers a payer from the selected wallet for a permissionless release', () => {
    registerHandlers();

    const otherPayer = chainAccount({ id: 'p1', accountId: payerId, walletId: 2 });
    const selectedPayer = chainAccount({ id: 'p2', accountId: createAccountId('3'), walletId: 5 });
    const params = {
      lockedAccountId: lockedId,
      candidates: [watchOnly()],
      chain: polkadotChain,
      allAccounts: [watchOnly(), otherPayer, selectedPayer],
      actions: UNLOCK,
    };

    // The user cannot pick the payer afterwards, so the selected wallet wins the tie…
    expect(resolveUnlockAccount({ ...params, preferredWalletId: 5 }).initiator).toBe(selectedPayer);
    // …and without a selection the first signer stands.
    expect(resolveUnlockAccount(params).initiator).toBe(otherPayer);
  });

  it('prefers the selected wallet when the same key lives in two wallets', () => {
    registerHandlers();

    const inVault = chainAccount({ id: 'v', walletId: 1 });
    const inOtherWallet = chainAccount({ id: 'o', walletId: 7 });

    const result = resolveUnlockAccount({
      lockedAccountId: lockedId,
      candidates: [inVault, inOtherWallet],
      chain: polkadotChain,
      allAccounts: [inVault, inOtherWallet],
      actions: REMOVE,
      preferredWalletId: 7,
    });

    expect(result.initiator).toBe(inOtherWallet);
  });

  it('reports chain-unsupported when the key is held but cannot act on the chain', () => {
    accountService.accountAvailabilityOnChainAnyOf.registerHandler({
      body: () => false,
      available: () => true,
    });
    accountService.accountActionPermissionAnyOf.registerHandler({
      body: () => true,
      available: () => true,
    });

    const result = resolveUnlockAccount({
      lockedAccountId: lockedId,
      candidates: [chainAccount({ id: 'a' })],
      chain: polkadotChain,
      allAccounts: [chainAccount({ id: 'a' })],
      actions: REMOVE,
    });

    expect(result.initiator).toBeNull();
    expect(result.reason).toBe('chain-unsupported');
  });

  it('has no payer when no local account can sign on the chain', () => {
    registerHandlers();

    const result = resolveUnlockAccount({
      lockedAccountId: lockedId,
      candidates: [watchOnly()],
      chain: polkadotChain,
      allAccounts: [watchOnly()],
      actions: UNLOCK,
    });

    expect(result.initiator).toBeNull();
    expect(result.reason).toBe('no-signer');
  });
});
