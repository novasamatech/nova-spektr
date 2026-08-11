import { type AccountId } from '@/shared/polkadotjs-schemas';

/**
 * Live validator preferences of a stash, domain-shaped.
 */
export type ValidatorPrefs = {
  /** Commission, in percent (0..100). */
  commission: number;
  /** The validator does not accept new nominations. */
  blocked: boolean;
};

/**
 * `null` means the stash is not registered as a validator. The distinction
 * matters: `staking.validators` is a `ValueQuery` map, so a plain query cannot
 * tell a missing entry from a real 0%-commission validator — only the raw
 * storage read used by the service can.
 */
export type ValidatorPrefsMap = Record<AccountId, ValidatorPrefs | null>;
