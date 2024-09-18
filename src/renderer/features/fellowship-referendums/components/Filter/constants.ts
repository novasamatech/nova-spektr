export const enum VoteStatus {
  VOTED = 'voted',
  NOT_VOTED = 'notVoted',
}

export const voteOptions = [
  { id: VoteStatus.VOTED, value: 'governance.voted' },
  { id: VoteStatus.NOT_VOTED, value: 'governance.filters.notVoted' },
];
