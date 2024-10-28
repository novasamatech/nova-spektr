import { type Vote } from './types';

const sortVotes = (a: Vote, b: Vote) => b.votes - a.votes;

export const votesService = {
  sortVotes,
};
