import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';

/**
 * How the picked nominations will leave the screen.
 *
 * - `local` - a wallet in this app signs, so the flow continues into
 *   confirm/sign;
 * - `draft` - the acting account lives in the address book, so the picked set is
 *   stored as a draft for someone else to sign;
 * - `watchOnly` - nothing can be signed at all; the screen is a read-only view of
 *   the account's current nominations.
 */
export type SigningMode = 'local' | 'draft' | 'watchOnly';

export type SortColumn = 'validator' | 'eraPoints' | 'blocks' | 'nominators' | 'ownStake' | 'commission' | 'apy';

export type SortDirection = 'asc' | 'desc';

export type SortState = {
  column: SortColumn;
  direction: SortDirection;
};

/**
 * The toolbar's own filters. Independent from the recommendation criteria -
 * these narrow the table the user browses, the criteria shape the "recommended"
 * set.
 */
export type FiltersState = {
  /** Minimum APY, in percent. `null` - no bound. */
  minApy: number | null;
  /** Maximum commission, in percent. `null` - no bound. */
  maxCommission: number | null;
  /** Minimum validator self stake, in planck. `null` - no bound. */
  minOwnStake: string | null;
  hideOversubscribed: boolean;
  /** Drops validators that authored zero blocks. Unknown block counts stay. */
  hideIdle: boolean;
  hasIdentity: boolean;
  neverSlashed: boolean;
};

/**
 * The single badge a validator row carries. Only one is shown - the most
 * important thing to know about a validator, not a list of everything true
 * about it.
 */
export type ValidatorFlag = 'blocked' | 'slashed' | 'oversubscribed' | 'cluster' | 'noIdentity';

/** Everything the header chips need to describe who is signing and how. */
export type SigningInfo = {
  signerName?: string;
  multisigLabel?: string;
  signatoriesCount?: number;
};

/** What a host flow hands over when it opens the validator picker. */
export type SelectionInput = {
  chain: Chain;
  asset: Asset;
  /** Defaults to `local`. */
  signingMode?: SigningMode;
  /** The acting account, shown as the header chip. */
  initiator?: AnyAccount;
  /**
   * Wallet the acting account belongs to. Passing it lets the header chip run
   * the full name resolution (custom name → contact → identity → wallet name)
   * instead of falling back to the raw account name.
   */
  initiatorWallet?: Wallet;
  /**
   * Validators the account nominates today. Preselected when nominations can be
   * changed, and rendered as read-only checks in watch-only mode.
   */
  nominatedIds?: AccountId[];
  signingInfo?: SigningInfo;
};

/**
 * The strings a validator row actually renders, keyed by account id. Sorting
 * and search run over these - never over the stored account id, which the user
 * never sees.
 */
export type DisplayedStrings = {
  names: Record<AccountId, string>;
  addresses: Record<AccountId, string>;
};
