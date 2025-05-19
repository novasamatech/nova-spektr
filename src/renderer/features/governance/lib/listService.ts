import orderBy from 'lodash/orderBy';

import { type DelegateInfo } from '@/shared/api/governance';
import { type Address, type Identity } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
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

function getMappedIdentity(proposers: Record<Address, Identity>, delegates: DelegateInfo[]) {
  const identity: Record<Address, Identity> = {};

  for (const { delegateAddress } of delegates) {
    if (nullable(proposers[delegateAddress])) continue;

    identity[delegateAddress] = proposers[delegateAddress];
  }

  return identity;
}
