import { BN } from '@polkadot/util';

import { type Chain, type ChainId, type Wallet } from '@/shared/core';
import { ZERO_BALANCE, getRelaychainAsset, nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accountService } from '@/domains/network';
import { type StakingPosition, type UnclaimedPayout, type UnclaimedPayouts, payoutsCacheKey } from '@/domains/staking';
import { isSignerAccount } from '@/features/signing-path';
import { type AmountFlowTarget } from '@/features/staking-amount-flow';
import { type ClaimRequest } from '@/features/staking-claim-rewards';
import { type RedeemTarget } from '@/features/staking-confirm-flow';
import { type SigningMode } from '@/features/validator-selection';

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
  chainId: ChainId;
  /** Whose rewards these are, most-preferred payer first. */
  nominators: AccountId[];
  payouts: UnclaimedPayout[];
};

/**
 * Who signs and pays for the payout.
 *
 * A payout call names the **validator**, not the nominator, and is
 * permissionless — the reward lands on each nominator's own payee whoever
 * submits it. So the nominator is a _preference_, not a requirement: when it is
 * an account we hold we use it, and when it is an address-book contact we fall
 * back to any account of ours that can sign on that chain rather than
 * abandoning rewards we are perfectly able to claim.
 *
 * Who counts as able to sign is `isSignerAccount`'s call and nothing else's —
 * the same predicate the signing-path graph terminates at, so this screen never
 * refuses a payer the flow behind it would have accepted.
 *
 * `null` only when this installation holds no signing key for the chain at all.
 * A signer whose wallet is not in `wallets` is still passed over, because the
 * claim flow is handed a `{ account, wallet }` pair and there is no honest
 * wallet to pair such an account with.
 */
export function resolveClaimPayer(
  nominators: AccountId[],
  chain: Chain,
  sources: ResolutionSources,
): ResolvedAccount | null {
  for (const accountId of nominators) {
    const own = resolveAccount(accountId, chain, sources);
    if (nonNullable(own) && isSignerAccount(own.account)) return own;
  }

  for (const account of sources.accounts) {
    if (!accountService.isAccountAvailableOnChain(account, chain)) continue;
    if (!isSignerAccount(account)) continue;

    const wallet = sources.wallets.find((w) => w.id === account.walletId);
    if (nonNullable(wallet)) return { account, wallet };
  }

  return null;
}

/** Why a claim entry produced no request — reported, never swallowed. */
export type ClaimResolutionSkip = {
  chainId: ChainId;
  chainName: string;
  reason: 'noSigner';
};

export type ClaimResolution = {
  requests: ClaimRequest[];
  skipped: ClaimResolutionSkip[];
};

/**
 * KPI claim entries → the requests `claimRewardsModel` takes.
 *
 * An entry the host cannot complete is **reported**, not dropped in silence: a
 * button that fires an event nobody can act on is worse than one that says
 * why.
 */
export function resolveClaimRequests(entries: KpiClaimEntry[], sources: ResolutionSources): ClaimResolution {
  const requests: ClaimRequest[] = [];
  const skipped: ClaimResolutionSkip[] = [];

  for (const entry of entries) {
    if (entry.payouts.length === 0) continue;

    const chain = sources.chains[entry.chainId];
    if (nullable(chain)) continue;

    const asset = getRelaychainAsset(chain.assets);
    if (nullable(asset)) continue;

    const payer = resolveClaimPayer(entry.nominators, chain, sources);
    if (nullable(payer)) {
      skipped.push({ chainId: chain.chainId, chainName: chain.name, reason: 'noSigner' });
      continue;
    }

    // The payer's mode, not the nominator's: `resolveClaimPayer` only returns
    // an account `isSignerAccount` accepts, so the request is signable here.
    requests.push({
      chain,
      asset,
      account: payer.account,
      wallet: payer.wallet,
      payouts: entry.payouts,
      signingMode: 'local',
    });
  }

  return { requests, skipped };
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

// The flows read `draft` as "start with draft mode on": an address-book
// position has nobody local to sign, a watch-only account holds no key.
function deriveSigningMode(resolved: ResolvedAccount | null): SigningMode {
  if (!resolved) return 'draft';

  return isSignerAccount(resolved.account) ? 'local' : 'watchOnly';
}

/**
 * A KPI request → the position a flow opens on.
 *
 * The KPI row identifies a position by address and chain only, so the position
 * itself is looked up live; without one the flow has nothing to open on — no
 * active stake to cap an amount against, no ledger to redeem from.
 *
 * `account` stays nullable on purpose — an address-book position resolves to
 * `null` here, which is exactly the state the flows read as "draft only".
 */
function resolvePositionTarget(
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
    signingMode: deriveSigningMode(resolved),
  };
}

/** A KPI unbond request → what the amount flow takes. */
export function resolveAmountFlowTarget(
  request: { accountId: AccountId; chainId: ChainId },
  positions: StakingPosition[],
  sources: ResolutionSources,
): AmountFlowTarget | null {
  return resolvePositionTarget(request, positions, sources);
}

/**
 * A KPI redeem request → what the confirm flow takes.
 *
 * The figure comes from the **position**, not from the request. The request
 * carries the number the chip was showing, but `withdraw_unbonded` takes no
 * amount at all — it withdraws whatever the ledger has unlocked — so the honest
 * figure to lead the confirm with is the freshest one, and both come from the
 * same aggregate anyway.
 *
 * A position with nothing unlocked is dropped: the call would move nothing and
 * still cost a fee.
 */
export function resolveRedeemTarget(
  request: { accountId: AccountId; chainId: ChainId },
  positions: StakingPosition[],
  sources: ResolutionSources,
): RedeemTarget | null {
  const target = resolvePositionTarget(request, positions, sources);
  if (nullable(target)) return null;

  const amount = target.position.redeemable;
  if (new BN(amount || ZERO_BALANCE).isZero()) return null;

  return { ...target, amount };
}

/** The wallet an account belongs to, or `null` when it belongs to none. */
export function findWallet(account: AnyAccount | null, wallets: Wallet[]): Wallet | null {
  if (nullable(account)) return null;

  const wallet = wallets.find((w) => w.id === account.walletId);

  return nonNullable(wallet) ? wallet : null;
}
