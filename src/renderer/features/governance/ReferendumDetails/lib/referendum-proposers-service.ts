import { ApiPromise } from '@polkadot/api';
import { u8aToString } from '@polkadot/util';
import { PalletIdentityRegistration } from '@polkadot/types/lookup';

import type { Address, Identity, SubIdentity } from '@shared/core';

export const referendumProposersService = {
  getIdentities,
};

async function getIdentities(api: ApiPromise, addresses: Address[]) {
  const subIdentities = await getSubIdentities(api, addresses);

  return getParentIdentities(api, subIdentities);
}

async function getSubIdentities(api: ApiPromise, addresses: Address[]): Promise<SubIdentity[]> {
  const subIdentities = await api.query.identity.superOf.multi(addresses);

  return subIdentities.map<SubIdentity>((identity, index) => {
    if (identity.isNone) {
      return {
        sub: addresses[index],
        parent: addresses[index],
        subName: '',
      };
    }

    const [address, rawData] = identity.unwrap();

    return {
      sub: addresses[index],
      parent: address.toHuman(),
      subName: rawData.isRaw ? u8aToString(rawData.asRaw) : rawData.value.toString(),
    };
  });
}

async function getParentIdentities(api: ApiPromise, subIdentities: SubIdentity[]) {
  const identityAddresses = subIdentities.map((x) => x.parent);
  const parentIdentities = await api.query.identity.identityOf.multi(identityAddresses);

  const result: Record<Address, Identity> = {};

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
        address: parent,
        name: display.isRaw ? u8aToString(display.asRaw) : display.value.toString(),
      },
    };
  }

  return result;
}
