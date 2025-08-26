import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { reshape } from 'patronum';

import { nonNullable, nonNullableMap, nullable } from '@/shared/lib/utils';
import { type ReferendumId, referendaPallet } from '@/shared/pallet/referenda';
import { createTxStore } from '@/shared/transactions';
import { type Evidence, trackService, votingService } from '@/domains/collectives';
import { type SigningPayload, signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';

import { fellowshipEvidenceFeature } from './feature';
import { fellowship } from './fellowship';

const flow = createGate<{ evidence: Evidence | null; aye: boolean }>({ defaultState: { evidence: null, aye: false } });

const { $api, $chain, $wallet, $wallets, $votingAccount, $votingMember } = reshape({
  source: fellowshipEvidenceFeature.input,
  shape: {
    $api: x => x?.api ?? null,
    $wallets: x => x?.wallets ?? [],
    $wallet: x => x?.wallet ?? null,
    $chain: x => x?.chain ?? null,
    $votingAccount: x => x?.account ?? null,
    $votingMember: x => x?.member ?? null,
  },
});

const $members = fellowship.$store.map(s => s?.members ?? []);
const $tracks = fellowship.$store.map(s => s?.tracks ?? []);
const $maxRank = fellowship.$store.map(s => s?.maxRank ?? 0);

const $evidence = flow.state.map(s => s.evidence);
const $aye = flow.state.map(s => s.aye);

const $member = combine($members, $evidence, (members, evidence) => {
  return members.find(m => m.accountId === evidence?.accountId) ?? null;
});

const $currentTrack = combine($member, $tracks, (member, tracks) => {
  if (nullable(member)) return null;
  return tracks.find(t => t.id === member.rank) ?? null;
});

const $nextTrack = combine($member, $tracks, (member, tracks) => {
  if (nullable(member)) return null;
  return tracks.find(t => t.id === member.rank + 1) ?? null;
});

const $nextReferendum = createStore<ReferendumId | null>(null);

const requestNextReferendumFx = createEffect(({ api }: { api: ApiPromise }) => {
  return referendaPallet.storage.referendumCount('fellowship', api).then(referendaPallet.helpers.toReferendumId);
});

sample({
  clock: fellowshipEvidenceFeature.running,
  target: requestNextReferendumFx,
});

sample({
  clock: requestNextReferendumFx.doneData,
  target: $nextReferendum,
});

const $proposal = combine({ api: $api, evidence: $evidence, member: $member }, ({ api, evidence, member }) => {
  if (nullable(api) || nullable(evidence) || nullable(member)) return null;

  return votingService.createProposal('fellowship', evidence, member, api);
});

const $coreTx = combine(
  {
    open: flow.status,
    chain: $chain,
    account: $votingAccount,
    member: $member,
    tracks: $tracks,
    evidence: $evidence,
    proposal: $proposal,
    aye: $aye,
    nextReferendum: $nextReferendum,
  },
  ({ open, tracks, ...params }) => {
    if (nonNullableMap(params)) {
      if (!open) return null;

      const track = trackService.getReferendumTrackFromRank(tracks, params.member.rank, params.evidence.wish);
      if (nullable(track)) return null;
      const originName = trackService.originNameFromTrack(track);

      return votingService.createEvidenceVotingTransaction({
        pallet: 'fellowship',
        originName,
        accountId: params.account.accountId,
        chain: params.chain,
        proposal: params.proposal,
        aye: params.aye,
        poll: params.nextReferendum,
      });
    }

    return null;
  },
);

const { $fee, $wrappedTx } = createTxStore({
  $active: flow.status,
  $api,
  $activeWallet: $wallet,
  $wallets,
  $chain,
  $coreTx,
  $account: $votingAccount,
});

// Signing

const sign = createEvent();
const signPayloadCreated = createEvent<SigningPayload | null>();

sample({
  clock: sign,
  source: {
    transactions: $wrappedTx,
    account: $votingAccount,
    chain: $chain,
  },
  fn: ({ transactions, account, chain }) => {
    if (nullable(transactions) || nullable(account) || nullable(chain)) {
      return null;
    }

    return {
      chain,
      account,
      transaction: transactions.wrappedTx,
      signatory: null,
    };
  },
  target: signPayloadCreated,
});

sample({
  clock: signPayloadCreated.filter({ fn: nonNullable }),
  fn: payload => ({ signingPayloads: [payload] }),
  target: signModel.events.formInitiated,
});

sample({
  clock: signModel.output.formSubmitted,
  source: {
    open: flow.status,
    transactions: $wrappedTx,
    account: $votingAccount,
    chain: $chain,
  },
  filter: ({ open, transactions, account, chain }) => {
    return open && nonNullable(chain) && nonNullable(transactions) && nonNullable(account);
  },
  fn({ transactions, account, chain }, signParams) {
    return {
      signatures: signParams.signatures,
      txPayloads: signParams.txPayloads,

      chain: chain!,
      account: account!,
      wrappedTxs: [transactions!.wrappedTx],
      coreTxs: [transactions!.coreTx],
    };
  },
  target: submitModel.events.formInitiated,
});

// Steps

const setStep = createEvent<'closed' | 'form' | 'submit'>();
const $step = restore(setStep, 'closed');

export const evidenceVoting = {
  flow,
  $member,
  $maxRank,
  $tracks,
  $currentTrack,
  $nextTrack,
  $proposal,
  $fee,
  $wallet,
  $votingMember,
  $votingAccount,

  $step,
  setStep,

  sign,
};
