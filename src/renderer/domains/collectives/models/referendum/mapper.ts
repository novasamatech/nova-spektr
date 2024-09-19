import { type ReferendaReferendumInfoConvictionVotingTally, type ReferendumId } from '@/shared/pallet/referenda';

import { type Referendum } from './types';

export const mapReferendum = (id: ReferendumId, info: ReferendaReferendumInfoConvictionVotingTally): Referendum => {
  switch (info.type) {
    case 'Ongoing':
      if (!('bareAyes' in info.data.tally)) {
        throw new Error(
          `Fellowship of Ambassador tally is incorrect, got\n${JSON.stringify(info.data.tally, null, 2)}`,
        );
      }

      return {
        id,
        type: info.type,
        track: info.data.track,
        submitted: info.data.submitted,
        origin: info.data.origin.type,
        enactment: {
          value: info.data.enactment.data,
          type: info.data.enactment.type,
        },
        inQueue: info.data.inQueue,
        deciding: info.data.deciding,
        tally: info.data.tally,
        decisionDeposit: info.data.decisionDeposit,
        submissionDeposit: info.data.submissionDeposit,
      };
    case 'Approved':
    case 'Rejected':
    case 'Cancelled':
    case 'TimedOut':
      return {
        id,
        type: info.type,
        since: info.data.since,
        submissionDeposit: info.data.submissionDeposit,
        decisionDeposit: info.data.decisionDeposit,
      };
    case 'Killed':
      return {
        id,
        type: info.type,
        since: info.data,
      };
  }
};
