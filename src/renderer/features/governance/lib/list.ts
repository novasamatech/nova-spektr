import orderBy from 'lodash/orderBy';

import { type Referendum } from '@shared/core';

export const listService = {
  sortReferendums,
};

// TODO: use block number to make an appropriate sorting
function sortReferendums(referendums: Referendum[]) {
  return orderBy(referendums, ({ referendumId }) => parseInt(referendumId), 'desc');
}
