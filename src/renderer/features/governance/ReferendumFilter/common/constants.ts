export const trackOptions = [
  { id: '0', value: 'governance.referendums.mainAgenda' },
  { id: '1', value: 'governance.referendums.fellowshipWhitelist' },
  { id: '2', value: 'governance.referendums.wishForChange' },
  { id: '10', value: 'governance.referendums.staking' },
  { id: '11', value: 'governance.referendums.treasuryAny' },
  { id: '12', value: 'governance.referendums.governanceLease' },
  { id: '13', value: 'governance.referendums.fellowshipAdmin' },
  { id: '14', value: 'governance.referendums.governanceRegistrar' },
  { id: '15', value: 'governance.referendums.crowdloans' },
  { id: '20', value: 'governance.referendums.governanceCanceller' },
  { id: '21', value: 'governance.referendums.governanceKiller' },
  { id: '30', value: 'governance.referendums.treasurySmallTips' },
  { id: '31', value: 'governance.referendums.treasuryBigTips' },
  { id: '32', value: 'governance.referendums.treasurySmallSpend' },
  { id: '33', value: 'governance.referendums.treasuryMediumSpend' },
  { id: '34', value: 'governance.referendums.treasuryBigSpend' },
];

export const enum VoteStatus {
  VOTED = 'voted',
  NOT_VOTED = 'notVoted',
}

export const voteOptions = [
  { id: VoteStatus.VOTED, value: 'governance.voted' },
  { id: VoteStatus.NOT_VOTED, value: 'governance.filters.notVoted' },
];
