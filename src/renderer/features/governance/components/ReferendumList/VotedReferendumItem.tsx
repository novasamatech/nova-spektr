import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';
import { memo } from 'react';

import { useI18n } from '@app/providers';
import { type Asset, type Chain } from '@/shared/core';
import { formatBalance, toNumberWithPrecision } from '@shared/lib/utils';
import { FootnoteText, HeadlineText, Icon } from '@shared/ui';
import { ReferendumVoteChart, TrackInfo, referendumService, votingService } from '@entities/governance';
import { type AggregatedReferendum } from '../../types/structs';
import { ReferendumEndTimer } from '../ReferendumEndTimer/ReferendumEndTimer';
import { VotingStatusBadge } from '../VotingStatusBadge';

import { ListItem } from './ListItem';

type Props = {
  referendum: AggregatedReferendum;
  network: { api: ApiPromise; chain: Chain; asset: Asset };
  votes: { value: BN; vote: string }[];
  onSelect: (value: AggregatedReferendum) => void;
};

export const VotedReferendumItem = memo(({ referendum, network, votes, onSelect }: Props) => {
  const { t } = useI18n();

  const { referendumId, approvalThreshold } = referendum;

  const voteFractions =
    referendumService.isOngoing(referendum) && approvalThreshold
      ? votingService.getVoteFractions(referendum.tally, approvalThreshold.value)
      : null;

  const titleNode = referendum.title || t('governance.referendums.referendumTitle', { index: referendumId });

  return (
    <ListItem onClick={() => onSelect(referendum)}>
      <div className="flex w-full items-center gap-x-2">
        <VotingStatusBadge referendum={referendum} />

        <ReferendumEndTimer status={referendum.status} endBlock={referendum.end} api={network.api} />

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

      <div className="flex items-center">
        <Icon name="voted" className="mr-1 text-icon-accent" size={16} />
        <FootnoteText className="text-tab-text-accent">
          {t('governance.addDelegation.summary.delegateVoted')}&nbsp;
        </FootnoteText>
        {votes.map((vote, index) => (
          <FootnoteText key={vote.vote} className="mr-1">
            {vote.vote.toLocaleUpperCase()}&nbsp;
            {t('governance.referendum.votes', {
              votes: formatBalance(vote.value, network.asset.precision).formatted,
              count: toNumberWithPrecision(+vote.value, network.asset.precision),
            })}
            {index < votes.length - 1 && ','}
          </FootnoteText>
        ))}
      </div>
    </ListItem>
  );
});
