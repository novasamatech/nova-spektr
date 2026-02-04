import { type ApiPromise } from '@polkadot/api';
import { allSettled } from 'effector';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { storageService } from '@/shared/api/storage';
import { ConnectionStatus, SigningType } from '@/shared/core';
import { collectivePallet } from '@/shared/pallet/collective';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type CoreMember, type Member, member } from '@/domains/collectives';
import { accountService } from '@/domains/network';
import { fellowshipMember } from '@/aggregates/fellowship-member';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import { walletSelect } from '@/aggregates/wallet-select';
import {
  allMembers,
  polkadotChain,
  polkadotChainId,
  senderAccount,
  senderBalance,
  testMembers,
  vaultWallet,
  watchOnlyWallet,
} from '../fixtures';
import { type FeatureTestEnvironment, FeatureTestBuilder } from '../utils';

/**
 * Integration tests for Fellowship Members aggregate.
 *
 * Uses FeatureTestBuilder + real aggregate wiring and seeds collectives member
 * resource via spied chain-storage calls.
 *
 * @group integration
 * @group fellowship
 * @group fellowship-members
 */
describe('Fellowship Members - Integration', () => {
  let env: FeatureTestEnvironment;
  const resourceParams = {
    palletType: 'fellowship' as const,
    api: { genesisHash: { toHex: () => polkadotChainId } } as unknown as ApiPromise,
  };
  const resourceKey = member.membersSubscriptionResource.createKey(resourceParams);

  afterEach(async () => {
    if (env) {
      await allSettled(member.membersSubscriptionResource.unsubscribe, {
        scope: env.scope,
        params: resourceKey,
      });
      await env.cleanup();
    }
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
    accountService.accountActionPermissionAnyOf.resetHandlers();
    vi.restoreAllMocks();
  });

  const setupAccountHandlers = () => {
    accountService.accountAvailabilityOnChainAnyOf.registerHandler({
      body: ({ account, chain }) => (accountService.isChainAccount(account) ? account.chainId === chain.chainId : true),
      available: () => true,
    });
    accountService.accountActionPermissionAnyOf.registerHandler({
      body: ({ account }) => account.signingType !== SigningType.WATCH_ONLY,
      available: () => true,
    });
  };

  const setupResourceResponses = (items: (Member | CoreMember)[]) => {
    vi.spyOn(collectivePallet.storage, 'members').mockResolvedValue(
      items.map((m) => ({
        account: m.accountId,
        member: { rank: m.rank } as any,
      })),
    );

    vi.spyOn(collectiveCorePallet.storage, 'member').mockResolvedValue(
      items
        .filter((m): m is CoreMember => 'isActive' in m)
        .map((m) => ({
          account: m.accountId,
          status: {
            isActive: m.isActive,
            lastPromotion: m.lastPromotion,
            lastProof: m.lastProof,
          } as any,
        })),
    );

    vi.spyOn(polkadotjsHelpers, 'subscribeSystemEvents').mockResolvedValue(() => {});
  };

  const loadMembers = async (items: (Member | CoreMember)[]) => {
    setupResourceResponses(items);

    await allSettled(member.membersSubscriptionResource.subscribe, {
      scope: env.scope,
      params: resourceParams,
    });
  };

  it('should expose chain members from cache sorted by rank desc (using testMembers)', async () => {
    setupAccountHandlers();

    env = await new FeatureTestBuilder()
      .withWallet(vaultWallet)
      .withAccount(senderAccount)
      .withBalance(senderBalance)
      .withChain(polkadotChain)
      .withApi(polkadotChainId, {})
      .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
      .build();

    await allSettled(fellowshipNetwork.selectCollective, {
      scope: env.scope,
      params: { chainId: polkadotChainId },
    });
    await loadMembers(testMembers);

    const chainMembers = env.scope.getState(fellowshipMember.$chainMembers);
    const expectedRanks = [...testMembers].map((m) => m.rank).sort((a, b) => b - a);

    expect(chainMembers).toHaveLength(testMembers.length);
    expect(chainMembers.map((m) => m.rank)).toEqual(expectedRanks);
  });

  it('should resolve current member from allMembers and available account', async () => {
    setupAccountHandlers();

    // Mock storage read to return our test data
    vi.spyOn(storageService.wallets, 'readAll').mockResolvedValue([vaultWallet]);
    vi.spyOn(storageService.accounts2, 'readAll').mockResolvedValue([senderAccount]);

    env = await new FeatureTestBuilder()
      .withWallet(vaultWallet)
      .withAccount(senderAccount)
      .withBalance(senderBalance)
      .withChain(polkadotChain)
      .withApi(polkadotChainId, {})
      .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
      .build();

    await allSettled(fellowshipNetwork.selectCollective, {
      scope: env.scope,
      params: { chainId: polkadotChainId },
    });
    await loadMembers(allMembers);

    // Verify chainMembers includes the expected member
    const chainMembers = env.scope.getState(fellowshipMember.$chainMembers);
    const matchingMember = chainMembers.find((m) => m.accountId === senderAccount.accountId);

    expect(chainMembers).toHaveLength(allMembers.length);
    expect(matchingMember).toBeDefined();
    expect(matchingMember?.accountId).toBe(senderAccount.accountId);
    expect(matchingMember?.rank).toBe(3);
  });

  it('should pick matching account/wallet by selected wallet id', async () => {
    setupAccountHandlers();

    const sameAddressWatchOnly = {
      ...senderAccount,
      id: 'sender-watch-only-duplicate',
      walletId: watchOnlyWallet.id,
    };

    // Mock storage read to return our test data
    vi.spyOn(storageService.wallets, 'readAll').mockResolvedValue([vaultWallet, watchOnlyWallet]);
    vi.spyOn(storageService.accounts2, 'readAll').mockResolvedValue([sameAddressWatchOnly, senderAccount]);

    env = await new FeatureTestBuilder()
      .withWallets([vaultWallet, watchOnlyWallet])
      .withAccounts([sameAddressWatchOnly, senderAccount])
      .withBalance(senderBalance)
      .withChain(polkadotChain)
      .withApi(polkadotChainId, {})
      .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
      .withStoreValue(walletSelect.__test.$selectedWalletId, vaultWallet.id)
      .build();

    await allSettled(fellowshipNetwork.selectCollective, {
      scope: env.scope,
      params: { chainId: polkadotChainId },
    });
    await loadMembers(allMembers);

    // Verify that member service correctly finds matching account by wallet id
    const { memberService } = await import('@/domains/collectives');
    const { walletModel } = await import('@/entities/wallet');

    const chainMembers = env.scope.getState(fellowshipMember.$chainMembers);
    const wallets = env.scope.getState(walletModel.$wallets);
    const availableAccounts = env.scope.getState(walletModel.$availableAccounts);

    // Find member matching our account
    const matchingMember = chainMembers.find((m) => m.accountId === senderAccount.accountId);
    expect(matchingMember).toBeDefined();

    // Verify findMatchingAccount returns correct account based on selected wallet
    const matchingAccount = memberService.findMatchingAccount(availableAccounts, matchingMember!, vaultWallet.id);
    expect(matchingAccount).toBeDefined();
    expect(matchingAccount?.walletId).toBe(vaultWallet.id);

    // Verify wallet can be found
    const matchingWallet = wallets.find((w) => w.id === matchingAccount?.walletId);
    expect(matchingWallet).toBeDefined();
    expect(matchingWallet?.id).toBe(vaultWallet.id);
  });

  it('should return null when user account is not a fellowship member', async () => {
    setupAccountHandlers();

    // Mock storage read to return our test data
    vi.spyOn(storageService.wallets, 'readAll').mockResolvedValue([vaultWallet]);
    vi.spyOn(storageService.accounts2, 'readAll').mockResolvedValue([senderAccount]);

    env = await new FeatureTestBuilder()
      .withWallet(vaultWallet)
      .withAccount(senderAccount)
      .withBalance(senderBalance)
      .withChain(polkadotChain)
      .withApi(polkadotChainId, {})
      .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
      .build();

    await allSettled(fellowshipNetwork.selectCollective, {
      scope: env.scope,
      params: { chainId: polkadotChainId },
    });

    // Load members that do NOT include senderAccount
    const { otherMember1, otherMember2, otherMember3 } = await import('../fixtures/fellowship/members');
    await loadMembers([otherMember1, otherMember2, otherMember3]);

    const chainMembers = env.scope.getState(fellowshipMember.$chainMembers);

    // Verify members are loaded but none match the user's account
    expect(chainMembers).toHaveLength(3);
    const matchingMember = chainMembers.find((m) => m.accountId === senderAccount.accountId);
    expect(matchingMember).toBeUndefined();

    // Verify findMatchingMember returns null for non-member
    const { memberService } = await import('@/domains/collectives');
    const { walletModel } = await import('@/entities/wallet');
    const availableAccounts = env.scope.getState(walletModel.$availableAccounts);

    const result = memberService.findMatchingMember(availableAccounts, chainMembers, null);
    expect(result).toBeNull();
  });

  it('should correctly load CoreMember properties (isActive, lastPromotion, lastProof)', async () => {
    setupAccountHandlers();

    env = await new FeatureTestBuilder()
      .withWallet(vaultWallet)
      .withAccount(senderAccount)
      .withBalance(senderBalance)
      .withChain(polkadotChain)
      .withApi(polkadotChainId, {})
      .withConnectionStatus(polkadotChainId, ConnectionStatus.CONNECTED)
      .build();

    await allSettled(fellowshipNetwork.selectCollective, {
      scope: env.scope,
      params: { chainId: polkadotChainId },
    });

    // Load CoreMembers with full properties
    await loadMembers(testMembers);

    const chainMembers = env.scope.getState(fellowshipMember.$chainMembers);

    // Verify CoreMember properties are present
    const { memberService } = await import('@/domains/collectives');

    for (const loadedMember of chainMembers) {
      // All testMembers are CoreMembers
      expect(memberService.isCoreMember(loadedMember)).toBe(true);

      if (memberService.isCoreMember(loadedMember)) {
        expect(loadedMember.isActive).toBeDefined();
        expect(typeof loadedMember.isActive).toBe('boolean');
        expect(loadedMember.lastPromotion).toBeDefined();
        expect(loadedMember.lastProof).toBeDefined();
      }
    }

    // Verify specific member has expected values from fixture
    const rank3Member = chainMembers.find((m) => m.rank === 3);
    expect(rank3Member).toBeDefined();
    if (rank3Member && memberService.isCoreMember(rank3Member)) {
      expect(rank3Member.isActive).toBe(true);
    }
  });
});
