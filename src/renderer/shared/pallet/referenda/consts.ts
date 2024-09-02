import { type ApiPromise } from '@polkadot/api';

import { pjsSchema } from '@/shared/polkadotjsSchemas';

import { referendaTrackInfo, trackId } from './schema';

const getPallet = (api: ApiPromise) => {
  const referenda = api.consts['referenda'];

  if (!referenda) {
    throw new TypeError(`referenda pallet not found`);
  }

  return referenda;
};

export const consts = {
  /**
   * The number of blocks after submission that a referendum must begin being
   * decided by. Once this passes, then anyone may cancel the referendum.
   */
  undecidingTimeout(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['undecidingTimeout']);
  },

  /**
   * The minimum amount to be used as a deposit for a public referendum
   * proposal.
   */
  submissionDeposit(api: ApiPromise) {
    return pjsSchema.u128.parse(getPallet(api)['submissionDeposit']);
  },

  /**
   * Maximum size of the referendum queue for a single track.
   */
  maxQueued(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['maxQueued']);
  },

  /**
   * Quantization level for the referendum wakeup scheduler. A higher number
   * will result in fewer storage reads/writes needed for smaller voters, but
   * also result in delays to the automatic referendum status changes. Explicit
   * servicing instructions are unaffected.
   */
  alarmInterval(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['alarmInterval']);
  },

  /**
   * Information concerning the different referendum tracks.
   */
  tracks(api: ApiPromise) {
    const schema = pjsSchema.vec(pjsSchema.tuppleMap(['track', trackId], ['info', referendaTrackInfo]));

    return schema.parse(getPallet(api)['tracks']);
  },
};
