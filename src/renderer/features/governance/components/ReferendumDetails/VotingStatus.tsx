import { useState } from 'react';

import { useI18n } from '@app/providers';
import { type Asset, type Chain } from '@shared/core';
import { formatBalance } from '@shared/lib/utils';
import { Button, FootnoteText, Icon } from '@shared/ui';
import { VoteChart, referendumService, votingService } from '@entities/governance';
import { type AggregatedReferendum } from '../../types/structs';
import { VotingStatusBadge } from '../VotingStatusBadge';

import { VoteDialog } from './VoteDialog';

type Props = {
  referendum: AggregatedReferendum;
  chain: Chain;
  asset: Asset | null;
};

export const VotingStatus = ({ referendum, chain, asset }: Props) => {
  const { t } = useI18n();
  const { approvalThreshold, supportThreshold } = referendum;
  const [voteOpen, setVoteOpen] = useState(false);
  if (!asset) {
    return null;
  }

  const isPassing = supportThreshold?.passing ?? false;

  const votedFractions =
    referendumService.isOngoing(referendum) && approvalThreshold
      ? votingService.getVoteFractions(referendum.tally, approvalThreshold.value)
      : null;
  const votedCount =
    referendumService.isOngoing(referendum) && supportThreshold
      ? votingService.getVotedCount(referendum.tally, supportThreshold.value)
      : null;

  const votedBalance = votedCount ? formatBalance(votedCount.voted, asset.precision, { K: true }) : null;
  const supportThresholdBalance = votedCount ? formatBalance(votedCount.of, asset.precision, { K: true }) : null;

  return (
    <div className="flex flex-col items-start gap-6">
      <VotingStatusBadge passing={isPassing} referendum={referendum} />
      {votedFractions && <VoteChart bgColor="icon-button" descriptionPosition="bottom" {...votedFractions} />}
      {votedBalance && supportThresholdBalance && (
        <div className="flex items-center gap-1.5 flex-wrap w-full">
          <Icon name="checkmarkOutline" size={18} className="text-icon-positive" />
          <FootnoteText className="text-text-secondary">{t('governance.referendum.threshold')}</FootnoteText>
          <FootnoteText className="grow text-end">
            {t('governance.referendum.votedTokens', {
              voted: votedBalance.value + votedBalance.suffix,
              total: supportThresholdBalance.value + supportThresholdBalance.suffix,
              asset: asset.symbol,
            })}
          </FootnoteText>
        </div>
      )}
      <Button className="w-full" onClick={() => setVoteOpen(true)}>
        {t('governance.referendum.vote')}
      </Button>

      {voteOpen && <VoteDialog referendum={referendum} chain={chain} onClose={() => setVoteOpen(false)} />}
    </div>
  );
};
