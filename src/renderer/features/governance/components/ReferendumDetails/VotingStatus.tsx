import { referendumService, votingService, VoteChart } from '@entities/governance';
import { formatBalance } from '@shared/lib/utils';
import { Button, FootnoteText, Icon } from '@shared/ui';
import { useI18n } from '@app/providers';
import { Asset } from '@shared/core';
import { VotingStatusBadge } from '../VotingStatusBadge';
import { AggregatedReferendum } from '../../types/structs';

type Props = {
  item: AggregatedReferendum;
  asset: Asset | null;
};

export const VotingStatus = ({ item, asset }: Props) => {
  const { t } = useI18n();
  const { referendum, approvalThreshold, supportThreshold } = item;

  if (!asset) {
    return null;
  }

  const isPassing = item.supportThreshold?.passing ?? false;

  const votedFractions =
    referendumService.isOngoing(referendum) && approvalThreshold
      ? votingService.getVoteFractions(referendum.tally, approvalThreshold.value)
      : null;
  const votedCount =
    referendumService.isOngoing(referendum) && supportThreshold
      ? votingService.getVotedCount(referendum.tally, supportThreshold.value)
      : null;

  const votedBalance = votedCount ? formatBalance(votedCount.voted.toString(), asset.precision) : null;
  const supportThresholdBalance = votedCount ? formatBalance(votedCount.of.toString(), asset.precision) : null;

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
      <Button className="w-full">Vote</Button>
    </div>
  );
};
