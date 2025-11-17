import { type Vote, type VotingRating } from './types';

const NOT_GOOD_THRESHOLD = 25;
const CONTROVERSIAL_THRESHOLD = 75;

const getApprovalRating = (votes: Vote[]): VotingRating | null => {
  if (votes.length === 0) {
    return null;
  }

  const totalAyes = votes.filter(vote => vote.decision === 'Aye').reduce((acc, v) => acc + v.votes, 0);
  const totalNays = votes.filter(vote => vote.decision === 'Nay').reduce((acc, v) => acc + v.votes, 0);
  const totalVotes = totalAyes + totalNays;

  const ayePercentage = totalVotes > 0 ? (totalAyes / totalVotes) * 100 : 0;

  if (ayePercentage <= NOT_GOOD_THRESHOLD) {
    return 'NotGood';
  }
  if (ayePercentage <= CONTROVERSIAL_THRESHOLD) {
    return 'Controversial';
  }
  return 'Good';
};

export const votingHistoryService = {
  getApprovalRating,
};
