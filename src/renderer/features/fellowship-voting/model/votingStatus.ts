import { combine, sample } from 'effector';

import { createFlow } from '@/shared/effector';
import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { member, referendum, referendumService, track, trackService, voting } from '@/domains/collectives';
import { accountService } from '@/domains/network';

import { fellowshipVotingFeature } from './feature';
import { fellowship } from './fellowship';

const flow = createFlow<{ referendumId: ReferendumId | null }>({ referendumId: null });

const $referendumId = flow.state.map(({ referendumId }) => referendumId);
const $referendums = fellowship.$store.map(store => store?.referendums ?? []);
const $maxRank = fellowship.$store.map(store => store?.maxRank ?? 0);
const $voting = fellowship.$store.map(store => store?.voting ?? []);
const $tracks = fellowship.$store.map(store => store?.tracks ?? []);
const $members = fellowship.$store.map(store => store?.members ?? []);
const $currentMember = fellowshipVotingFeature.input.map(input => input?.member ?? null);
const $votingAccount = fellowshipVotingFeature.input.map(input => input?.account ?? null);

// voting

const $accountsVotes = combine({ voting: $voting, account: $votingAccount }, ({ voting, account }) => {
  return voting.filter(voting => voting.accountId === account?.accountId);
});

sample({
  clock: fellowshipVotingFeature.running,
  fn(input) {
    return {
      palletType: input.palletType,
      api: input.api,
      chain: input.chain,
    };
  },
  target: voting.requestAll,
});

sample({
  clock: fellowshipVotingFeature.running,
  fn: ({ palletType, api, chain, account }) => ({
    palletType,
    api,
    chainId: chain.chainId,
    accounts: account ? [account.accountId] : [],
  }),
  target: voting.subscribeAccountsVoting,
});

sample({
  clock: fellowshipVotingFeature.stopped,
  target: voting.unsubscribeAccountsVoting,
});

sample({
  clock: attachToFeatureInput(fellowshipVotingFeature, voting.receive),
  fn({ input, data: { result } }) {
    return {
      api: input.api,
      palletType: input.palletType,
      chainId: input.chainId,
      referendums: result.map(v => v.referendumId),
    };
  },
  target: referendum.request,
});

// referendum

const $referendum = combine($referendums, $referendumId, (referendums, referendumId) => {
  return referendums.find(referendum => referendum.id === referendumId) ?? null;
});

const $referendumVoting = combine($accountsVotes, $referendumId, (voting, referendumId) => {
  return voting.find(vote => vote.referendumId === referendumId) ?? null;
});

sample({
  clock: attachToFeatureInput(fellowshipVotingFeature, $referendumId),
  fn: ({ data: referendumId, input: { api, chainId, palletType } }) => ({
    api,
    chainId,
    palletType,
    referendums: [referendumId].filter(nonNullable),
  }),
  target: referendum.request,
});

sample({
  clock: fellowshipVotingFeature.running,
  target: [track.request, member.subscribe],
});

sample({
  clock: fellowshipVotingFeature.stopped,
  target: member.unsubscribe,
});

// member

const $memberTrack = combine($tracks, $currentMember, (tracks, member) => {
  if (nullable(member)) return null;
  return tracks.find(t => t.id === member.rank) ?? null;
});

const $hasRequiredRank = combine(
  {
    member: $currentMember,
    referendum: $referendum,
    maxRank: $maxRank,
  },
  ({ member, referendum, maxRank }) => {
    if (nullable(member) || nullable(referendum) || referendumService.isCompleted(referendum)) {
      return false;
    }

    return trackService.rankSatisfiesVotingThreshold(member.rank, maxRank, referendum.track);
  },
);

const $canVote = $votingAccount.map(a => nonNullable(a) && accountService.hasPermissionToMakeActions(a));

// proposer

const $proposer = combine($members, $referendum, (members, referendum) => {
  if (nullable(referendum) || !referendumService.isOngoing(referendum)) return null;

  const proposal = referendum.proposal;
  if (nullable(proposal) || !referendumService.isEvidenceProposal(proposal)) return null;

  return members.find(member => member.accountId === proposal.accountId) ?? null;
});

const $proposerTrack = combine($tracks, $proposer, (tracks, proposer) => {
  if (nullable(proposer)) return null;
  return tracks.find(t => t.id === proposer?.rank) ?? null;
});

const $nextProposerTrack = combine(
  {
    tracks: $tracks,
    proposer: $proposer,
    referendum: $referendum,
  },
  ({ tracks, proposer, referendum }) => {
    if (nullable(referendum) || !referendumService.isOngoing(referendum)) return null;
    if (nullable(proposer)) return null;

    const index = tracks.findIndex(t => t.id === proposer.rank);

    // HINT: promotion can add more than 1 rank
    return tracks.at(index + (referendum.track % 10)) ?? null;
  },
);

export const votingStatus = {
  $referendumVoting,
  $accountsVotes,
  $hasRequiredRank,
  $votingAccount,
  $currentMember,
  $maxRank,
  $proposer,
  $memberTrack,
  $currentProposerTrack: $proposerTrack,
  $nextProposerTrack,
  $canVote,
  $referendum,
  flow,
};
