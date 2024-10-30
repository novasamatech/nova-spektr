import { VotingHistory } from './components/VotingHistory';
import { VotingSummary } from './components/VotingSummary';
import { votesModel } from './model/votes';

export const fellowshipVotingHistoryFeature = {
  model: {
    votes: votesModel,
  },
  views: {
    VotingHistory,
    VotingSummary,
  },
};
