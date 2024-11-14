import { type ApiPromise } from '@polkadot/api';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

const getPallet = (api: ApiPromise) => {
  const pallet = api.consts['proxy'];
  if (!pallet) {
    throw new TypeError('proxy pallet not found');
  }

  return pallet;
};

export const consts = {
  /**
   * The base amount of currency needed to reserve for creating an announcement.
   *
   * This is held when a new storage item holding a `Balance` is created
   * (typically 16 bytes).
   */
  announcementDepositBase(api: ApiPromise) {
    return pjsSchema.u128.parse(getPallet(api)['announcementDepositBase']);
  },

  /**
   * The amount of currency needed per announcement made.
   *
   * This is held for adding an `AccountId`, `Hash` and `BlockNumber` (typically
   * 68 bytes) into a pre-existing storage value.
   */
  announcementDepositFactor(api: ApiPromise) {
    return pjsSchema.u128.parse(getPallet(api)['announcementDepositFactor']);
  },

  /**
   * The maximum amount of time-delayed announcements that are allowed to be
   * pending.
   */
  maxPending(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['maxPending']);
  },

  /**
   * The maximum amount of proxies allowed for a single account.
   */
  maxProxies(api: ApiPromise) {
    return pjsSchema.u32.parse(getPallet(api)['maxProxies']);
  },

  /**
   * The base amount of currency needed to reserve for creating a proxy.
   *
   * This is held for an additional storage item whose value size is
   * `sizeof(Balance)` bytes and whose key size is `sizeof(AccountId)` bytes.
   */
  proxyDepositBase(api: ApiPromise) {
    return pjsSchema.u128.parse(getPallet(api)['proxyDepositBase']);
  },

  /**
   * The amount of currency needed per proxy added.
   *
   * This is held for adding 32 bytes plus an instance of `ProxyType` more into
   * a pre-existing storage value. Thus, when configuring `ProxyDepositFactor`
   * one should take into account `32 + proxy_type.encode().len()` bytes of
   * data.
   */
  proxyDepositFactor(api: ApiPromise) {
    return pjsSchema.u128.parse(getPallet(api)['proxyDepositFactor']);
  },
};
