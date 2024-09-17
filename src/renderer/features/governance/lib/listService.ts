import orderBy from 'lodash/orderBy';

import { ReferendumType } from '@/shared/core';
import { type AggregatedReferendum } from '../types/structs';

export const listService = {
  sortReferendums,
  sortReferendumsByOngoing,
};

// TODO: use block number to make an appropriate sorting
function sortReferendums(referendums: AggregatedReferendum[]) {
  return orderBy(referendums, (referendum) => parseInt(referendum.referendumId), 'desc');
}

function sortReferendumsByOngoing(referendums: AggregatedReferendum[]) {
  return orderBy(
    referendums,
    [(referendum) => referendum.type === ReferendumType.Ongoing, (referendum) => parseInt(referendum.referendumId)],
    ['desc', 'desc'],
  );
}
