import { type ApiPromise } from '@polkadot/api';
import { useStoreMap } from 'effector-react';
import { memo } from 'react';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, HeadlineText } from '@/shared/ui';
import { VotedBy } from '@/shared/ui-entities';
import { Skeleton } from '@/shared/ui-kit';
import { ReferendumVoteChart, TrackInfo, referendumService, votingService } from '@/entities/governance';
import { proposerIdentityAggregate } from '../../aggregates/proposerIdentity';
import { type AggregatedReferendum } from '../../types/structs';
import { ReferendumEndTimer } from '../ReferendumEndTimer/ReferendumEndTimer';
import { VotingStatusBadge } from '../VotingStatusBadge';

import { ListItem } from './ListItem';

type Props = {
  api: ApiPromise;
  asset: Asset;
  referendum: AggregatedReferendum;
  isTitlesLoading: boolean;
  onSelect: (value: AggregatedReferendum) => void;
};

export const ReferendumItem = memo(({ api, asset, referendum, isTitlesLoading, onSelect }: Props) => {
  const { t } = useI18n();

  const { referendumId, approvalThreshold } = referendum;

  const voter = useStoreMap({
    store: proposerIdentityAggregate.$proposers,
    keys: [referendum.votedByDelegate?.delegateId],
    fn: (proposers, [delegateId]) => (delegateId ? (proposers[delegateId] ?? null) : null),
  });

  const voteFractions =
    referendumService.isOngoing(referendum) && approvalThreshold
      ? votingService.getVoteFractions(referendum.tally, approvalThreshold.value)
      : null;

  const titleNode =
    referendum.title ||
    (isTitlesLoading ? (
      <Skeleton height="1em" width="28ch" />
    ) : (
      t('governance.referendums.referendumTitle', { index: referendumId })
    ));

  if (referendum.voting.votes.length > 1) {
    console.log('=== referendum', referendum);
  }

  return (
    <ListItem onClick={() => onSelect(referendum)}>
      <div className="flex w-full items-center gap-x-2">
        <VotingStatusBadge referendum={referendum} />

        <ReferendumEndTimer status={referendum.status} endBlock={referendum.end} api={api} />

        <div className="ml-auto flex text-text-secondary">
          {referendumId && <FootnoteText className="text-inherit">#{referendumId}</FootnoteText>}
          {referendumService.isOngoing(referendum) && <TrackInfo trackId={referendum.track} />}
        </div>
      </div>

      <div className="flex w-full items-start gap-x-6">
        <HeadlineText className="pointer-events-auto flex-1">{titleNode}</HeadlineText>
        <div className="shrink-0 basis-[200px]">
          {voteFractions ? (
            <ReferendumVoteChart aye={voteFractions.aye} nay={voteFractions.nay} pass={voteFractions.pass} />
          ) : null}
        </div>
      </div>

      <VotedBy
        asset={asset}
        voterName={voter?.parent.name}
        delegate={referendum.votedByDelegate}
        castingVotes={referendum.voting.votes}
      />
    </ListItem>
  );
});
