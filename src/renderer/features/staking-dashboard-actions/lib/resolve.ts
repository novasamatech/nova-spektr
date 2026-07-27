import { type Chain, type ChainId, type Wallet } from '@/shared/core';
import { getRelaychainAsset, nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accountService } from '@/domains/network';
import { type StakingPosition, type UnclaimedPayout, type UnclaimedPayouts, payoutsCacheKey } from '@/domains/staking';
import { type AmountFlowTarget } from '@/features/staking-amount-flow';
import { type ClaimRequest } from '@/features/staking-claim-rewards';

/**
 * Everything the KPI row leaves out.
 *
 * Its requests carry an `accountId` and a `chainId` and nothing else — the row
 * never holds a chain, an asset or a wallet — so the whole gap between what a
 * button emits and what a flow takes is closed here, from stores the wiring
 * module already reads.
 */
export type ResolutionSources = {
  chains: Record<ChainId, Chain>;
  accounts: AnyAccount[];
  wallets: Wallet[];
};

export type ResolvedAccount = {
  account: AnyAccount;
  wallet: Wallet;
};

/**
 * The local account behind an address on a given chain, with its wallet.
 *
 * `null` for an address-book position: it has no account object of this
 * installation, and there is nothing honest to put in its place. Every caller
 * below skips such an entry rather than inventing one.
 */
export function resolveAccount(
  accountId: AccountId,
  chain: Chain,
  { accounts, wallets }: Pick<ResolutionSources, 'accounts' | 'wallets'>,
): ResolvedAccount | null {
  const account = accounts.find((a) => a.accountId === accountId && accountService.isAccountAvailableOnChain(a, chain));
  if (nullable(account)) return null;

  const wallet = wallets.find((w) => w.id === account.walletId);
  if (nullable(wallet)) return null;

  return { account, wallet };
}

export type KpiClaimEntry = {
  accountId: AccountId;
  chainId: ChainId;
  payouts: UnclaimedPayout[];
};

/**
 * KPI claim entries → the requests `claimRewardsModel` takes.
 *
 * Anything that cannot be resolved end to end — an unknown chain, a chain with
 * no staking asset, an address with no local account or no wallet, an entry
 * with no payouts left — is dropped. A half-built request would reach the
 * confirm as a row the user cannot sign.
 */
export function resolveClaimRequests(entries: KpiClaimEntry[], sources: ResolutionSources): ClaimRequest[] {
  const requests: ClaimRequest[] = [];

  for (const entry of entries) {
    if (entry.payouts.length === 0) continue;

    const chain = sources.chains[entry.chainId];
    if (nullable(chain)) continue;

    const asset = getRelaychainAsset(chain.assets);
    if (nullable(asset)) continue;

    const resolved = resolveAccount(entry.accountId, chain, sources);
    if (nullable(resolved)) continue;

    requests.push({ chain, asset, account: resolved.account, wallet: resolved.wallet, payouts: entry.payouts });
  }

  return requests;
}

/**
 * One group per chain, in the order the chains were first seen.
 *
 * The claim flow signs on one network at a time — it cannot quote a fee that
 * spans two native tokens — so a selection covering two chains is two sessions,
 * never one that silently drops half of it.
 */
export function groupRequestsByChain(requests: ClaimRequest[]): ClaimRequest[][] {
  const byChain = new Map<ChainId, ClaimRequest[]>();

  for (const request of requests) {
    const group = byChain.get(request.chain.chainId);
    if (group) {
      group.push(request);
    } else {
      byChain.set(request.chain.chainId, [request]);
    }
  }

  return [...byChain.values()];
}

/** The unclaimed payouts one stash has on one chain, as the cache holds them. */
export function readPayouts(
  accountId: AccountId,
  chainId: ChainId,
  eras: Record<ChainId, number>,
  cache: Record<string, UnclaimedPayouts>,
): UnclaimedPayout[] {
  const activeEra = eras[chainId];
  if (nullable(activeEra)) return [];

  return cache[payoutsCacheKey(chainId, accountId, activeEra)]?.payouts ?? [];
}

/**
 * A KPI unbond request → what the amount flow takes.
 *
 * The KPI row identifies a position by address and chain only, so the position
 * itself is looked up live; without one there is no active stake to cap the
 * amount against and the flow has nothing to open on.
 *
 * `account` stays nullable on purpose — an address-book position resolves to
 * `null` here, which is exactly the state the flow reads as "draft only".
 */
export function resolveAmountFlowTarget(
  { accountId, chainId }: { accountId: AccountId; chainId: ChainId },
  positions: StakingPosition[],
  sources: ResolutionSources,
): AmountFlowTarget | null {
  const chain = sources.chains[chainId];
  if (nullable(chain)) return null;

  const asset = getRelaychainAsset(chain.assets);
  if (nullable(asset)) return null;

  const position = positions.find((p) => p.accountId === accountId && p.chainId === chainId);
  if (nullable(position)) return null;

  const resolved = resolveAccount(accountId, chain, sources);

  return {
    position,
    chain,
    asset,
    account: resolved?.account ?? null,
    wallet: resolved?.wallet ?? null,
  };
}

/** The wallet an account belongs to, or `null` when it belongs to none. */
export function findWallet(account: AnyAccount | null, wallets: Wallet[]): Wallet | null {
  if (nullable(account)) return null;

  const wallet = wallets.find((w) => w.id === account.walletId);

  return nonNullable(wallet) ? wallet : null;
}
