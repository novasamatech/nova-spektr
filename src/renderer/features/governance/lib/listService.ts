import orderBy from 'lodash/orderBy';

import { type AggregatedReferendum } from '../types/structs';

export const listService = {
  sortReferendums,
  sortReferendumsByOngoing,
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
