import { VotingHistory } from './components/VotingHistory';
import { votesModel } from './model/votes';

export const fellowshipVotesFeature = {
  model: {
    votes: votesModel,
  },
  views: {
    VotingHistory,
  },
};
