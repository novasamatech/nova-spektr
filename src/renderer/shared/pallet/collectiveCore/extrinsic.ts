import { type ApiPromise } from '@polkadot/api';

import { type HexString } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { getPalletName } from './helpers';
import { type PalletType } from './types';

const getConstructor = (type: PalletType, api: ApiPromise, name: string) => {
  const palletName = getPalletName(type);
  const pallet = api.tx[palletName];
  if (!pallet) {
    throw new TypeError(`${palletName} pallet not found in ${api.runtimeChain.toString()} chain`);
  }

  const constructor = pallet[name];
  if (!constructor) {
    throw new TypeError(`${name} constructor not found`);
  }

  return constructor;
};

export const extrinsic = {
  /**
   * Approve a member to continue at their rank.
   *
   * This resets `last_proof` to the current block, thereby delaying any
   * automatic demotion.
   *
   * `who` must already be tracked by this pallet for this to have an effect.
   *
   * - `origin`: An origin which satisfies `ApproveOrigin` or root.
   * - `who`: A member (i.e. of non-zero rank).
   * - `at_rank`: The rank of member.
   */
  approve(type: PalletType, api: ApiPromise, who: AccountId, atRank: number) {
    return getConstructor(type, api, 'approve')(who, atRank);
  },

  /**
   * Bump the state of a member.
   *
   * This will demote a member whose `last_proof` is now beyond their rank's
   * `demotion_period`.
   *
   * - `origin`: A `Signed` origin of an account.
   * - `who`: A member account whose state is to be updated.
   */
  bump(type: PalletType, api: ApiPromise, who: AccountId) {
    return getConstructor(type, api, 'bump')(who);
  },

  /**
   * Introduce an already-ranked individual of the collective into this pallet.
   * The rank may still be zero.
   *
   * This resets `last_proof` to the current block and `last_promotion` will be
   * set to zero, thereby delaying any automatic demotion but allowing immediate
   * promotion.
   *
   * - `origin`: A signed origin of a ranked, but not tracked, account.
   */
  import(type: PalletType, api: ApiPromise) {
    return getConstructor(type, api, 'import')();
  },

  /**
   * Introduce a new and unranked candidate (rank zero).
   *
   * - `origin`: An origin which satisfies `InductOrigin` or root.
   * - `who`: The account ID of the candidate to be inducted and become a member.
   */
  induct(type: PalletType, api: ApiPromise, who: AccountId) {
    return getConstructor(type, api, 'induct')(who);
  },

  /**
   * Stop tracking a prior member who is now not a ranked member of the
   * collective.
   *
   * - `origin`: A `Signed` origin of an account.
   * - `who`: The ID of an account which was tracked in this pallet but which is
   *   now not a ranked member of the collective.
   */
  offboard(type: PalletType, api: ApiPromise, who: AccountId) {
    return getConstructor(type, api, 'offboard')(who);
  },

  /**
   * Increment the rank of a ranked and tracked account.
   *
   * - `origin`: An origin which satisfies `PromoteOrigin` with a `Success` result
   *   of `to_rank` or more or root.
   * - `who`: The account ID of the member to be promoted to `to_rank`.
   * - `to_rank`: One more than the current rank of `who`.
   */
  promote(type: PalletType, api: ApiPromise, who: AccountId, toRank: number) {
    return getConstructor(type, api, 'promote')(who, toRank);
  },

  /**
   * Fast promotions can skip ranks and ignore the `min_promotion_period`.
   *
   * This is useful for out-of-band promotions, hence it has its own
   * `FastPromoteOrigin` to be (possibly) more restrictive than `PromoteOrigin`.
   * Note that the member must already be inducted.
   */
  promoteFast(type: PalletType, api: ApiPromise, who: AccountId, toRank: number) {
    return getConstructor(type, api, 'promoteFast')(who, toRank);
  },

  /**
   * Set whether a member is active or not.
   *
   * - `origin`: A `Signed` origin of a member's account.
   * - `is_active`: `true` iff the member is active.
   */
  setActive(type: PalletType, api: ApiPromise, isActive: boolean) {
    return getConstructor(type, api, 'setActive')(isActive);
  },

  /**
   * Set the parameters.
   *
   * - `origin`: An origin complying with `ParamsOrigin` or root.
   * - `params`: The new parameters for the pallet.
   */
  setParams(type: PalletType, api: ApiPromise, params: unknown) {
    return getConstructor(type, api, 'setParams')(params);
  },

  /**
   * Set the parameters partially.
   *
   * - `origin`: An origin complying with `ParamsOrigin` or root.
   * - `partial_params`: The new parameters for the pallet.
   *
   * This update config with multiple arguments without duplicating the fields
   * that does not need to update (set to None).
   */
  setPartialParams(type: PalletType, api: ApiPromise, params: unknown) {
    return getConstructor(type, api, 'setPartialParams')(params);
  },

  /**
   * Provide evidence that a rank is deserved.
   *
   * This is free as long as no evidence for the forthcoming judgement is
   * already submitted. Evidence is cleared after an outcome (either demotion,
   * promotion of approval).
   *
   * - `origin`: A `Signed` origin of an inducted and ranked account.
   * - `wish`: The stated desire of the member.
   * - `evidence`: A dump of evidence to be considered. This should generally be
   *   either a Markdown-encoded document or a series of 32-byte hashes which
   *   can be found on a decentralised content-based-indexing system such as
   *   IPFS.
   */
  submitEvidence(type: PalletType, api: ApiPromise, wish: 'Promotion' | 'Retention', evidence: HexString) {
    return getConstructor(type, api, 'submitEvidence')(wish, evidence);
  },
};
