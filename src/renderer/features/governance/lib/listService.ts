import { orderBy } from 'lodash';

import { type DelegateInfo } from '@/shared/api/governance';
import { type Identity } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AggregatedReferendum } from '../types/structs';

export const listService = {
  sortReferendums,
  sortReferendumsByOngoing,
  getMappedIdentity,
};

// TODO: use block number to make an appropriate sorting
function sortReferendums(referendums: AggregatedReferendum[]) {
  return orderBy(
    referendums,
    [(referendum) => parseInt(referendum.end?.toString() || '0'), (referendum) => parseInt(referendum.referendumId)],
    ['asc', 'desc'],
  );
}

function sortReferendumsByOngoing(referendums: AggregatedReferendum[]) {
  return orderBy(
    referendums,
    [(referendum) => referendum.type === 'Ongoing', (referendum) => parseInt(referendum.referendumId)],
    ['desc', 'desc'],
  );
}

function getMappedIdentity(proposers: Record<AccountId, Identity>, delegates: DelegateInfo[]) {
  const identity: Record<AccountId, Identity> = {};

  for (const { delegateAccount } of delegates) {
    if (nullable(proposers[delegateAccount])) continue;

    identity[delegateAccount] = proposers[delegateAccount];
  }

  return identity;
}
