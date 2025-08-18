import { type ApiPromise } from '@polkadot/api';
import { type PalletIdentityRegistration } from '@polkadot/types/lookup';
import { u8aToString } from '@polkadot/util';

import { type Identity, type SubIdentity } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

async function getIdentities(api: ApiPromise, accounts: AccountId[]) {
  if (accounts.length === 0) {
    return {};
  }

  const subIdentities = await getSubIdentities(api, accounts);

  return getParentIdentities(api, subIdentities);
}

async function getSubIdentities(api: ApiPromise, accounts: AccountId[]): Promise<SubIdentity[]> {
  const subIdentities = await api.query.identity.superOf.multi(accounts);

  return subIdentities.map<SubIdentity>((identity, index) => {
    if (identity.isNone) {
      return {
        sub: accounts[index],
        parent: accounts[index],
        subName: '',
      };
    }

    const [address, rawData] = identity.unwrap();

    return {
      sub: accounts[index],
      parent: toAccountId(address.toHuman()),
      subName: rawData.isRaw ? u8aToString(rawData.asRaw) : rawData.value.toString(),
    };
  });
}

async function getParentIdentities(api: ApiPromise, subIdentities: SubIdentity[]) {
  const identityAddresses = subIdentities.map((x) => x.parent);
  const parentIdentities = await api.query.identity.identityOf.multi(identityAddresses);

  const result: Record<AccountId, Identity> = {};

  for (const [index, identityOption] of parentIdentities.entries()) {
    if (identityOption.isNone) {
      continue;
    }

    const subIdentity = subIdentities[index];
    const identity = identityOption.unwrap();
    // HINT: in runtime 1_4_0 unwrappedIdentity returns Option<(identity, rest)>
    const data = ('info' in identity ? identity : identity[0]) as PalletIdentityRegistration;

    const { parent, sub, subName } = subIdentity;
    const { display, web, email, twitter } = data.info;

    result[sub] = {
      subName,
      email: email.isRaw ? u8aToString(email.asRaw) : email.value.toString(),
      twitter: twitter.isRaw ? u8aToString(twitter.asRaw) : twitter.value.toString(),
      website: web.isRaw ? u8aToString(web.asRaw) : web.value.toString(),
      parent: {
        accountId: parent,
        name: display.isRaw ? u8aToString(display.asRaw) : display.value.toString(),
      },
    };
  }

  return result;
}

export const proposersService = {
  getIdentities,
};
