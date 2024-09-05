import { type ApiPromise } from '@polkadot/api';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

import { getPalletName } from './helpers';
import { referendaTrackInfo, trackId } from './schema';
import { type PalletType } from './types';

const getPallet = (type: PalletType, api: ApiPromise) => {
  const name = getPalletName(type);
  const pallet = api.consts[name];

  if (!pallet) {
    throw new TypeError(`${name} pallet not found`);
  }

  return pallet;
};

export const consts = {
  /**
   * The number of blocks after submission that a referendum must begin being
   * decided by. Once this passes, then anyone may cancel the referendum.
   */
  undecidingTimeout(type: PalletType, api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(type, api)['undecidingTimeout']);
  },

  /**
   * The minimum amount to be used as a deposit for a public referendum
   * proposal.
   */
  submissionDeposit(type: PalletType, api: ApiPromise) {
    return pjsSchema.u128.parse(getPallet(type, api)['submissionDeposit']);
  },

  /**
   * Maximum size of the referendum queue for a single track.
   */
  maxQueued(type: PalletType, api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(type, api)['maxQueued']);
  },

  /**
   * Quantization level for the referendum wakeup scheduler. A higher number
   * will result in fewer storage reads/writes needed for smaller voters, but
   * also result in delays to the automatic referendum status changes. Explicit
   * servicing instructions are unaffected.
   */
  alarmInterval(type: PalletType, api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(type, api)['alarmInterval']);
  },

  /**
   * Information concerning the different referendum tracks.
   */
  tracks(type: PalletType, api: ApiPromise) {
    const schema = pjsSchema.vec(pjsSchema.tuppleMap(['track', trackId], ['info', referendaTrackInfo]));

    return schema.parse(getPallet(type, api)['tracks']);
  },
};
