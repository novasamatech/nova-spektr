type TrackDescription = {
  [key: string]: { [key: string]: string };
};

export const treasurySpendsDescription: TrackDescription = {
  'governance.addDelegation.tracks.treasurySmallTipsDescription': {
    DOT: '250',
    KSM: '8.25',
    default: 'small',
  },
  'governance.addDelegation.tracks.treasuryBigTipsDescription': {
    DOT: '1,000',
    KSM: '33.33',
    default: 'big',
  },
  'governance.addDelegation.tracks.treasurySmallSpendDescription': {
    DOT: '10,000',
    KSM: '333.33',
    default: 'small',
  },
  'governance.addDelegation.tracks.treasuryMediumSpendDescription': {
    DOT: '100,000',
    KSM: '3,333.33',
  },
  'governance.addDelegation.tracks.treasuryBigSpendDescription': {
    DOT: '1,000,000',
    KSM: '33,333.33',
  },
  'governance.addDelegation.tracks.treasuryAnyDescription': {
    DOT: '10,000,000',
    KSM: '333,333.33',
  },
};

export const adminTracks = [
  {
    id: '0',
    value: 'governance.addDelegation.tracks.root',
    description: 'governance.addDelegation.tracks.rootDescription',
  },
  {
    id: '2',
    value: 'governance.addDelegation.tracks.wishForChange',
    description: 'governance.addDelegation.tracks.wishForChangeDescription',
  },
  {
    id: '20',
    value: 'governance.addDelegation.tracks.governanceCanceller',
    description: 'governance.addDelegation.tracks.governanceCancellerDescription',
  },

  {
    id: '21',
    value: 'governance.addDelegation.tracks.governanceKiller',
    description: 'governance.addDelegation.tracks.governanceKillerDescription',
  },
];

export const governanceTracks = [
  {
    id: '12',
    value: 'governance.addDelegation.tracks.governanceLease',
    description: 'governance.addDelegation.tracks.governanceLeaseDescription',
  },
  {
    id: '15',
    value: 'governance.addDelegation.tracks.crowdloans',
    description: 'governance.addDelegation.tracks.crowdloansDescription',
  },
  {
    id: '11',
    value: 'governance.addDelegation.tracks.treasuryAny',
    description: 'governance.addDelegation.tracks.treasuryAnyDescription',
  },
  {
    id: '14',
    value: 'governance.addDelegation.tracks.governanceRegistrar',
    description: 'governance.addDelegation.tracks.governanceRegistrarDescription',
  },
  {
    id: '10',
    value: 'governance.addDelegation.tracks.staking',
    description: 'governance.addDelegation.tracks.stakingDescription',
  },
];

export const treasuryTracks = [
  {
    id: '30',
    value: 'governance.addDelegation.tracks.treasurySmallTips',
    description: 'governance.addDelegation.tracks.treasurySmallTipsDescription',
  },
  {
    id: '31',
    value: 'governance.addDelegation.tracks.treasuryBigTips',
    description: 'governance.addDelegation.tracks.treasuryBigTipsDescription',
  },
  {
    id: '32',
    value: 'governance.addDelegation.tracks.treasurySmallSpend',
    description: 'governance.addDelegation.tracks.treasurySmallSpendDescription',
  },
  {
    id: '33',
    value: 'governance.addDelegation.tracks.treasuryMediumSpend',
    description: 'governance.addDelegation.tracks.treasuryMediumSpendDescription',
  },
  {
    id: '34',
    value: 'governance.addDelegation.tracks.treasuryBigSpend',
    description: 'governance.addDelegation.tracks.treasuryBigSpendDescription',
  },
];

export const fellowshipTracks = [
  {
    id: '1',
    value: 'governance.addDelegation.tracks.fellowshipWhitelist',
    description: 'governance.addDelegation.tracks.fellowshipWhitelistDescription',
  },
  {
    id: '13',
    value: 'governance.addDelegation.tracks.fellowshipAdmin',
    description: 'governance.addDelegation.tracks.fellowshipAdminDescription',
  },
];

export const allTracks = [...adminTracks, ...governanceTracks, ...treasuryTracks, ...fellowshipTracks];
