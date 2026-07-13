import { type VestingStatus } from '../types';

type ResolvedSource = {
  /**
   * The network config has been read. False only before it loads — a user who
   * has disabled every chain still counts as loaded, and their (genuinely
   * empty) answer must be allowed through rather than left spinning forever.
   */
  chainsLoaded: boolean;
  /** Chains that have yet to say whether they hold vesting. */
  unresolved: number;
  /** Wallets are still being read from storage. */
  loadingWallets: boolean;
};

/**
 * Everything that could still surface a schedule has answered. Only under this
 * condition may the block say the wallet has no vesting.
 *
 * Wallets are part of the question: before they load there are no keys to look
 * up, and "no keys" would otherwise resolve instantly into a false empty state.
 * The network config is part of it for the same reason.
 */
export const isFullyResolved = ({ chainsLoaded, unresolved, loadingWallets }: ResolvedSource): boolean =>
  !loadingWallets && chainsLoaded && unresolved === 0;

type StatusSource = {
  hasSchedules: boolean;
  fullyResolved: boolean;
  /** A terminal state has already been shown for this account set. */
  settledOnce: boolean;
};

/**
 * Skeleton until we know; then content, or a truthful empty.
 *
 * `settledOnce` is the latch. Chains keep connecting, erroring and reconnecting
 * for the whole life of the app, so a chain slipping back to unresolved would
 * otherwise throw a long-settled block back to a skeleton. Once an answer has
 * been shown, further loading is reported through `isLoadingMore` instead.
 */
export const resolveStatus = ({ hasSchedules, fullyResolved, settledOnce }: StatusSource): VestingStatus => {
  if (hasSchedules) return 'ready';

  return fullyResolved || settledOnce ? 'empty' : 'loading';
};

/** Content is on screen, and chains that may add to it are still reporting. */
export const isLoadingMore = ({ status, fullyResolved }: { status: VestingStatus; fullyResolved: boolean }): boolean =>
  !fullyResolved && status !== 'loading';
