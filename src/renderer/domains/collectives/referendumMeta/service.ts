import { type ReferendumMeta } from './types';

function getReferendumVotingFromStatus(referendum: ReferendumMeta) {
  switch (referendum.status) {
    case 'Executed':
    case 'Approved':
    case 'Confirmed':
    case 'Submitted':
      return 'Aye';

    case 'Rejected':
      return 'Nay';
  }
}

export const referendumMetaService = {
  getReferendumVotingFromStatus,
};
