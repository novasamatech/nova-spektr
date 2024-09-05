import { type ApiPromise } from '@polkadot/api';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

const getPallet = (api: ApiPromise) => {
  const convictionVoting = api.consts['convictionVoting'];
  if (!convictionVoting) {
    throw new TypeError('convictionVoting pallet not found');
  }

  return convictionVoting;
};

export const consts = {
  /**
   * The minimum period of vote locking.
   *
   * It should be no shorter than enactment period to ensure that in the case of
   * an approval, those successful voters are locked into the consequences that
   * their votes entail.
   */
  voteLockingPeriod(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['voteLockingPeriod']);
  },

  /**
   * The maximum number of concurrent votes an account may have.
   *
   * Also used to compute weight, an overly large value can lead to extrinsics
   * with large weight estimation: see `delegate` for instance.
   */
  maxVotes(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['maxVotes']);
  },
};
