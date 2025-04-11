import { type ApiPromise } from '@polkadot/api';

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
   * Introduce a new member.
   *
   * - `origin`: Must be the `AddOrigin`.
   * - `who`: Account of non-member which will become a member.
   *
   * Weight: `O(1)`
   */
  addMember(type: PalletType, api: ApiPromise, who: AccountId) {
    return getConstructor(type, api, 'addMember')(who);
  },

  /**
   * Remove votes from the given poll. It must have ended.
   *
   * - `origin`: Must be `Signed` by any account.
   * - `poll_index`: Index of a poll which is completed and for which votes
   *   continue to exist.
   * - `max`: Maximum number of vote items from remove in this call.
   *
   * Transaction fees are waived if the operation is successful.
   *
   * Weight `O(max)` (less if there are fewer items to remove than `max`).
   */
  cleanupPoll(type: PalletType, api: ApiPromise, pool: number, max: number) {
    return getConstructor(type, api, 'cleanupPoll')(pool, max);
  },

  /**
   * Decrement the rank of an existing member by one. If the member is already
   * at rank zero, then they are removed entirely.
   *
   * - `origin`: Must be the `DemoteOrigin`.
   * - `who`: Account of existing member of rank greater than zero.
   *
   * Weight: `O(1)`, less if the member's index is highest in its rank.
   */
  demoteMember(type: PalletType, api: ApiPromise, who: AccountId) {
    return getConstructor(type, api, 'demoteMember')(who);
  },

  /**
   * Exchanges a member with a new account and the same existing rank.
   *
   * - `origin`: Must be the `ExchangeOrigin`.
   * - `who`: Account of existing member of rank greater than zero to be
   *   exchanged.
   * - `new_who`: New Account of existing member of rank greater than zero to
   *   exchanged to.
   */
  exchangeMember(type: PalletType, api: ApiPromise, who: AccountId, newWho: AccountId) {
    return getConstructor(type, api, 'exchangeMember')(who, newWho);
  },

  /**
   * Increment the rank of an existing member by one.
   *
   * - `origin`: Must be the `PromoteOrigin`.
   * - `who`: Account of existing member.
   *
   * Weight: `O(1)`
   */
  promoteMember(type: PalletType, api: ApiPromise, who: AccountId) {
    return getConstructor(type, api, 'promoteMember')(who);
  },

  /**
   * Remove the member entirely.
   *
   * - `origin`: Must be the `RemoveOrigin`.
   * - `who`: Account of existing member of rank greater than zero.
   * - `min_rank`: The rank of the member or greater.
   *
   * Weight: `O(min_rank)`.
   */
  removeMember(type: PalletType, api: ApiPromise, who: AccountId, minRank: number) {
    return getConstructor(type, api, 'removeMember')(who, minRank);
  },

  /**
   * Add an aye or nay vote for the sender to the given proposal.
   *
   * - `origin`: Must be `Signed` by a member account.
   * - `poll`: Index of a poll which is ongoing.
   * - `aye`: `true` if the vote is to approve the proposal, `false` otherwise.
   *
   * Transaction fees are be waived if the member is voting on any particular
   * proposal for the first time and the call is successful. Subsequent vote
   * changes will charge a fee.
   *
   * Weight: `O(1)`, less if there was no previous vote on the poll by the
   * member.
   */
  vote(type: PalletType, api: ApiPromise, poll: number, aye: boolean) {
    return getConstructor(type, api, 'vote')(poll, aye);
  },
};
