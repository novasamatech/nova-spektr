import { type ChainId, type EraIndex, type Stake } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraAnchor } from '../era/service';
import { type ExposureMap } from '../exposures/types';
import { type Nomination } from '../nominations/types';
import { type ValidatorPrefs } from '../validator-prefs/types';
import { type EraValidatorMap } from '../validators/types';

/**
 * A single `unlocking` entry of the ledger, resolved against the active era.
 */
export type UnbondingChunk = {
  /** Amount being unbonded, in planck. */
  value: string;
  /** Era the chunk becomes withdrawable at. */
  era: EraIndex;
  /** Eras left until the chunk unlocks, `0` once it is redeemable. */
  erasLeft: number;
  /**
   * Estimated unlock moment (unix ms), derived from the era anchor. `null` when
   * no anchor is available - the UI falls back to the era count.
   */
  unlockEstimateMs: number | null;
  /** The chunk already unlocked (`era <= activeEra`) and can be withdrawn. */
  redeemable: boolean;
};

/**
 * - `active` - nominating and exposed in the active era, earning rewards.
 * - `waiting` - nominations submitted, the election has not applied them yet.
 * - `inactive` - nominating, election applied, but not exposed anywhere.
 * - `bonded` - a ledger exists, but the stash nominates nothing.
 * - `unknown` - the active-era exposures have not been read yet, so whether this
 *   position is exposed is not established.
 *
 * `unknown` is the only one that is not a fact about the chain: it says the app
 * has not looked. It exists because the alternative was to report `inactive`
 * while the exposure pages were still in flight - a red pill claiming the
 * user's validators dropped them, on a position that turns out to be earning.
 *
 * For a `validator` position the ladder is shorter: `active` - elected into the
 * active era, `waiting` - registered but not elected, `unknown` - the era set
 * has not been read. `inactive` and `bonded` are unreachable - elected means
 * exposed, and there is no nominator-style "elected but dropped out" state.
 */
export type PositionStatus = 'active' | 'waiting' | 'inactive' | 'bonded' | 'unknown';

/**
 * Why an `inactive` position earns nothing. Always `null` for the other
 * statuses, and `null` when the era validator set is unavailable - the reason
 * is never guessed.
 */
export type PositionStatusReason = 'notElected' | 'notExposed' | null;

/**
 * Where one nomination of a position stands in the active era.
 *
 * - `active` - elected and its active-era exposure includes our stash;
 * - `waiting` - not elected this era, so it cannot back anyone;
 * - `droppedOut` - elected, but our stake did not make it into a rewarded page.
 */
export type NominationStatus = 'active' | 'waiting' | 'droppedOut';

export type PositionKind = 'nominator' | 'validator';

/**
 * Validator-specific facts of a position. `commission`/`blocked` come from the
 * live prefs (or the era prefs when the stash chilled but is still elected);
 * the exposure-derived fields are `null` until the stash is elected and the era
 * validator set has been read.
 */
export type PositionValidatorInfo = {
  /** Commission, in percent (0..100). */
  commission: number;
  /** The validator does not accept new nominations. */
  blocked: boolean;
  /** Self stake in the active era, planck. */
  ownStake: string | null;
  /** Own + nominator stake in the active era, planck. */
  totalExposure: string | null;
  nominatorCount: number | null;
  /** Reward points earned in the last completed era. */
  eraPoints: number | null;
};

export type StakingPosition = {
  accountId: AccountId;
  chainId: ChainId;
  /** Ledger data as-is. */
  stake: Stake;
  status: PositionStatus;
  statusReason: PositionStatusReason;
  kind: PositionKind;
  /** Non-null exactly when `kind` is `validator`. */
  validator: PositionValidatorInfo | null;
  /** Everything the stash nominates. */
  nominations: AccountId[];
  /** Nominated validators whose active-era exposure includes the stash. */
  activeValidators: AccountId[];
  /** Chunks still unbonding (`era > activeEra`), soonest first. */
  unbonding: UnbondingChunk[];
  /** Planck sum of chunks with `era <= activeEra`. */
  redeemable: string;
  /** Planck sum of chunks with `era > activeEra`. */
  totalUnbonding: string;
};

/**
 * Everything `derivePosition` needs, already fetched. The module is pure: no
 * api access, no stores, no wall clock - the era anchor carries the timing.
 */
export type DerivePositionInput = {
  accountId: AccountId;
  chainId: ChainId;
  stake: Stake;
  /** `null` when the stash has no nomination on chain. */
  nomination: Nomination | null;
  /**
   * `null` when the stash is not registered as a validator — or when the prefs
   * subscription has not answered yet; the aggregate's pending flag covers that
   * gap, the derivation does not distinguish the two.
   */
  validatorPrefs: ValidatorPrefs | null;
  /**
   * Active-era exposures of (at least) the nominated validators. `null` until
   * the read answers - an empty map is itself an answer ("nothing backs this
   * stash"), the absence of one is not, and conflating the two is what made a
   * loading position look inactive.
   */
  exposures: ExposureMap | null;
  /** Elected validators of the active era, `null` when unavailable. */
  validators: EraValidatorMap | null;
  activeEra: EraIndex;
  /** `null` when the chain doesn't expose enough data for era timing. */
  eraAnchor: EraAnchor | null;
};
