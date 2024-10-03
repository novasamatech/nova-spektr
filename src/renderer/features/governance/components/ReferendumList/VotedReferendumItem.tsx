import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';
import { memo, useEffect, useState } from 'react';

import { useI18n } from '@app/providers';
import { type Asset, type Chain } from '@/shared/core';
import { formatBalance, getTimeToBlock, toNumberWithPrecision } from '@shared/lib/utils';
import { FootnoteText, HeadlineText, Icon } from '@shared/ui';
import {
  ReferendumTimer,
  ReferendumVoteChart,
  TrackInfo,
  referendumService,
  votingService,
} from '@entities/governance';
import { type AggregatedReferendum } from '../../types/structs';
import { VotingStatusBadge } from '../VotingStatusBadge';

import { ListItem } from './ListItem';

type Props = {
  referendum: AggregatedReferendum;
  network: { api: ApiPromise; chain: Chain; asset: Asset };
  vote: { value: BN; vote: string };
  onSelect: (value: AggregatedReferendum) => void;
};

export const VotedReferendumItem = memo<Props>(({ referendum, network, vote, onSelect }) => {
  const { t } = useI18n();

  const [endTime, setEndTime] = useState<number>();

  useEffect(() => {
    if (referendum.end) {
      getTimeToBlock(referendum.end, network.api).then((date) => {
        setEndTime(date / 1000);
      });
    }
  }, []);

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

        {endTime && referendum.status && <ReferendumTimer status={referendum.status} time={endTime} />}

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
        <FootnoteText>
          {vote.vote.toLocaleUpperCase()}&nbsp;
          {t('governance.referendum.votes', {
            votes: formatBalance(vote.value, network.asset.precision).formatted,
            count: toNumberWithPrecision(+vote.value, network.asset.precision),
          })}
        </FootnoteText>
      </div>
    </ListItem>
  );
});
