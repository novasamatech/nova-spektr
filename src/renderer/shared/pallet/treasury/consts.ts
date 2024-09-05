import { type ApiPromise } from '@polkadot/api';

import { pjsSchema } from '../../polkadotjs-schemas';

import { getPalletName } from './helpers';
import { type PalletType } from './types';

const getPallet = (api: ApiPromise, type: PalletType) => {
  const palletName = getPalletName(type);
  const pallet = api.consts[palletName];
  if (!pallet) {
    throw new TypeError(`${palletName} pallet not found`);
  }

  return pallet;
};

export const consts = {
  /**
   * Percentage of spare funds (if any) that are burnt per spend period.
   */
  burn(type: PalletType, api: ApiPromise) {
    return pjsSchema.permill.parse(getPallet(api, type)['burn']);
  },

  /**
   * The maximum number of approvals that can wait in the spending queue.
   *
   * NOTE: This parameter is also used within the Bounties Pallet extension if
   * enabled.
   */
  maxApprovals(type: PalletType, api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api, type)['maxApprovals']);
  },

  /**
   * The treasury's pallet id, used for deriving its sovereign account ID.
   */
  palletId(type: PalletType, api: ApiPromise) {
    return pjsSchema.u8.parse(getPallet(api, type)['palletId']);
  },

  /**
   * The period during which an approved treasury spend has to be claimed.
   */
  payoutPeriod(type: PalletType, api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api, type)['payoutPeriod']);
  },

  /**
   * Period between successive spends.
   */
  spendPeriod(type: PalletType, api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api, type)['spendPeriod']);
  },
};
