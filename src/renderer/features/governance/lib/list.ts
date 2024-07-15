import orderBy from 'lodash/orderBy';

import { AggregatedReferendum } from '../types/structs';

export const listService = {
  sortReferendums,
};

// TODO: use block number to make an appropriate sorting
function sortReferendums(referendums: AggregatedReferendum[]) {
  return orderBy(referendums, (referendum) => parseInt(referendum.referendumId), 'desc');
}
