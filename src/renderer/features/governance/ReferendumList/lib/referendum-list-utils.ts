import { ReferendumId, OngoingReferendum, CompletedReferendum } from '@shared/core';

export const referendumListUtils = {
  getSortedOngoing,
  getSortedCompleted,
};

function getSortedOngoing(referendums: Map<ReferendumId, OngoingReferendum>): Map<ReferendumId, OngoingReferendum> {
  console.log('=== refs', referendums.get('784'));
  console.log('=== refs', referendums.get('763'));

  return referendums;
}

function getSortedCompleted(
  referendums: Map<ReferendumId, CompletedReferendum>,
): Map<ReferendumId, CompletedReferendum> {
  return new Map();
  // return new Map(orderBy(Array.from(referendums), ([index]) => parseInt(index), 'desc'));
}
