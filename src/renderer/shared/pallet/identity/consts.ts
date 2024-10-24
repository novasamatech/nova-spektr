import { type ApiPromise } from '@polkadot/api';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

const getPallet = (api: ApiPromise) => {
  const pallet = api.consts['identity'];
  if (!pallet) {
    throw new TypeError('identity pallet not found');
  }

  return pallet;
};

export const consts = {
  /**
   * The amount held on deposit for a registered identity.
   */
  basicDeposit(api: ApiPromise) {
    return pjsSchema.u128.parse(getPallet(api)['basicDeposit']);
  },

  /**
   * The amount held on deposit per encoded byte for a registered identity.
   */
  byteDeposit(api: ApiPromise) {
    return pjsSchema.u128.parse(getPallet(api)['byteDeposit']);
  },

  /**
   * Maximum number of registrars allowed in the system. Needed to bound the
   * complexity of, e.g., updating judgements.
   */
  maxRegistrars(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['maxRegistrars']);
  },

  /**
   * The maximum number of sub-accounts allowed per identified account.
   */
  maxSubAccounts(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['maxSubAccounts']);
  },

  /**
   * The maximum length of a suffix.
   */
  maxSuffixLength(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['maxSuffixLength']);
  },

  /**
   * The maximum length of a username, including its suffix and any system-added
   * delimiters.
   */
  maxUsernameLength(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['maxUsernameLength']);
  },

  /**
   * The number of blocks within which a username grant must be accepted.
   */
  pendingUsernameExpiration(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['pendingUsernameExpiration']);
  },

  /**
   * The amount held on deposit for a registered subaccount. This should account
   * for the fact that one storage item's value will increase by the size of an
   * account ID, and there will be another trie item whose value is the size of
   * an account ID plus 32 bytes.
   */
  subAccountDeposit(api: ApiPromise) {
    return pjsSchema.u128.parse(getPallet(api)['subAccountDeposit']);
  },
};
