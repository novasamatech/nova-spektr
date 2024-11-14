import { type ApiPromise } from '@polkadot/api';
import { zipWith } from 'lodash';
import { z } from 'zod';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';

import { identityRegistration, identityRegistrationInfo } from './schema';

const getQuery = (api: ApiPromise, name: string) => {
  const pallet = api.query['identity'];
  if (!pallet) {
    throw new TypeError(`identity pallet not found in ${api.runtimeChain.toString()} chain`);
  }

  const query = pallet[name];

  if (!query) {
    throw new TypeError(`${name} query not found`);
  }

  return query;
};

export const storage = {
  /**
   * Reverse lookup from `username` to the `AccountId` that has registered it.
   * The value should be a key in the `IdentityOf` map, but it may not if the
   * user has cleared their identity.
   *
   * Multiple usernames may map to the same `AccountId`, but `IdentityOf` will
   * only map to one primary username.
   */
  accountOfUsername(api: ApiPromise, usernames: string[]) {
    const textEncoder = new TextEncoder();
    const inputs = usernames.map(textEncoder.encode);
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['username', pjsSchema.storageKey(pjsSchema.bytesString).transform(x => x[0])],
        ['account', pjsSchema.optional(pjsSchema.accountId)],
      ),
    );

    return substrateRpcPool.call(() => getQuery(api, 'accountOfUsername').entries(inputs)).then(schema.parse);
  },

  /**
   * Information that is pertinent to identify the entity behind an account.
   * First item is the registration, second is the account's primary username.
   *
   * TWOX-NOTE: OK ― `AccountId` is a secure hash.
   */
  identityOf(api: ApiPromise, accounts: AccountId[]) {
    const schema = pjsSchema.vec(
      pjsSchema.optional(z.tuple([identityRegistration, pjsSchema.optional(pjsSchema.bytes)])),
    );

    return substrateRpcPool
      .call(() => getQuery(api, 'identityOf').multi(accounts))
      .then(schema.parse)
      .then(response => zipWith(accounts, response, (account, identity) => ({ account, identity })));
  },

  /**
   * Usernames that an authority has granted, but that the account controller
   * has not confirmed that they want it. Used primarily in cases where the
   * `AccountId` cannot provide a signature because they are a pure proxy,
   * multisig, etc. In order to confirm it, they should call
   * [`Call::accept_username`].
   *
   * First tuple item is the account and second is the acceptance deadline.
   */
  pendingUsernames(api: ApiPromise, usernames: string[]) {
    const textEncoder = new TextEncoder();
    const inputs = usernames.map(textEncoder.encode);
    const schema = pjsSchema.vec(
      pjsSchema.tupleMap(
        ['username', pjsSchema.storageKey(pjsSchema.bytesString).transform(x => x[0])],
        ['info', pjsSchema.optional(z.tuple([pjsSchema.accountId, pjsSchema.blockHeight]))],
      ),
    );

    return substrateRpcPool.call(() => getQuery(api, 'pendingUsernames').entries(inputs)).then(schema.parse);
  },

  /**
   * The set of registrars. Not expected to get very big as can only be added
   * through a special origin (likely a council motion).
   *
   * The index into this can be cast to `RegistrarIndex` to get a valid value.
   */
  registrars(api: ApiPromise) {
    const schema = pjsSchema.vec(pjsSchema.optional(identityRegistrationInfo));

    return substrateRpcPool.call(() => getQuery(api, 'registrars').entries()).then(schema.parse);
  },

  /**
   * Alternative "sub" identities of this account.
   *
   * The first item is the deposit, the second is a vector of the accounts.
   *
   * TWOX-NOTE: OK ― `AccountId` is a secure hash.
   */
  subsOf() {
    throw new Error('identityPallet.storage.subsOf method not implemented yet.');
  },

  /**
   * The super-identity of an alternative "sub" identity together with its name,
   * within that context. If the account is not some other account's
   * sub-identity, then just `None`.
   */
  superOf() {
    throw new Error('identityPallet.storage.superOf method not implemented yet.');
  },

  /**
   * A map of the accounts who are authorized to grant usernames.
   */
  usernameAuthorities() {
    throw new Error('identityPallet.storage.usernameAuthorities method not implemented yet.');
  },
};
