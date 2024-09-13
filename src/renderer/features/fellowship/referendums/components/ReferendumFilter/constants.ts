export const trackOptions = [
  { id: '1', value: 'fellowship.referendums.tracks.members' },
  { id: '2', value: 'fellowship.referendums.tracks.proficientMembers' },
  { id: '3', value: 'fellowship.referendums.tracks.fellows' },
  { id: '4', value: 'fellowship.referendums.tracks.architects' },
  { id: '5', value: 'fellowship.referendums.tracks.architectsAdept' },
  { id: '6', value: 'fellowship.referendums.tracks.grandArchitects' },
  { id: '7', value: 'fellowship.referendums.tracks.masters' },
  { id: '8', value: 'fellowship.referendums.tracks.mastersConstant' },
  { id: '9', value: 'fellowship.referendums.tracks.grandMasters' },
  { id: '11', value: 'fellowship.referendums.tracks.retainAtIDan' },
  { id: '12', value: 'fellowship.referendums.tracks.retainAtIiDan' },
  { id: '13', value: 'fellowship.referendums.tracks.retainAtIiiDan' },
  { id: '14', value: 'fellowship.referendums.tracks.retainAtIvDan' },
  { id: '15', value: 'fellowship.referendums.tracks.retainAtVDan' },
  { id: '16', value: 'fellowship.referendums.tracks.retainAtViDan' },
  { id: '21', value: 'fellowship.referendums.tracks.promoteToIDan' },
  { id: '22', value: 'fellowship.referendums.tracks.promoteToIiDan' },
  { id: '23', value: 'fellowship.referendums.tracks.promoteToIiiDan' },
  { id: '24', value: 'fellowship.referendums.tracks.promoteToIvDan' },
  { id: '25', value: 'fellowship.referendums.tracks.promoteToVDan' },
  { id: '26', value: 'fellowship.referendums.tracks.promoteToViDan' },
];

export const enum VoteStatus {
  VOTED = 'voted',
  NOT_VOTED = 'notVoted',
}

export const voteOptions = [
  { id: VoteStatus.VOTED, value: 'governance.voted' },
  { id: VoteStatus.NOT_VOTED, value: 'governance.filters.notVoted' },
];
