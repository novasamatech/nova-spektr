export const adminTracks = [
  { id: '0', value: 'governance.referendums.mainAgenda', description: 'governance.referendums.mainAgendaDescription' },
  {
    id: '1',
    value: 'governance.referendums.fellowshipWhitelist',
    description: 'governance.referendums.fellowshipWhitelistDescription',
  },
  {
    id: '2',
    value: 'governance.referendums.wishForChange',
    description: 'governance.referendums.wishForChangeDescription',
  },
  { id: '15', value: 'governance.referendums.crowdloans', description: 'governance.referendums.crowdloansDescription' },
];

export const governanceTracks = [
  {
    id: '12',
    value: 'governance.referendums.governanceLease',
    description: 'governance.referendums.governanceLeaseDescription',
  },
  {
    id: '14',
    value: 'governance.referendums.governanceRegistrar',
    description: 'governance.referendums.governanceRegistrarDescription',
  },
  {
    id: '20',
    value: 'governance.referendums.governanceCanceller',
    description: 'governance.referendums.governanceCancellerDescription',
  },
  {
    id: '21',
    value: 'governance.referendums.governanceKiller',
    description: 'governance.referendums.governanceKillerDescription',
  },
  { id: '10', value: 'governance.referendums.staking', description: 'governance.referendums.stakingDescription' },
];

export const treasuryTracks = [
  {
    id: '30',
    value: 'governance.referendums.treasurySmallTips',
    description: 'governance.referendums.treasurySmallTipsDescription',
  },
  {
    id: '31',
    value: 'governance.referendums.treasuryBigTips',
    description: 'governance.referendums.treasuryBigTipsDescription',
  },
  {
    id: '32',
    value: 'governance.referendums.treasurySmallSpend',
    description: 'governance.referendums.treasurySmallSpendDescription',
  },
  {
    id: '33',
    value: 'governance.referendums.treasuryMediumSpend',
    description: 'governance.referendums.treasuryMediumSpendDescription',
  },
  {
    id: '34',
    value: 'governance.referendums.treasuryBigSpend',
    description: 'governance.referendums.treasuryBigSpendDescription',
  },
  {
    id: '11',
    value: 'governance.referendums.treasuryAny',
    description: 'governance.referendums.treasuryAnySpendDescription',
  },
];

export const fellowshipTracks = [
  {
    id: '13',
    value: 'governance.referendums.fellowshipAdmin',
    description: 'governance.referendums.fellowshipAdminDescription',
  },
];

export const allTracks = [...adminTracks, ...governanceTracks, ...treasuryTracks, ...fellowshipTracks];
