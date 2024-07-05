import { referendumService, votingService, VoteChart } from '@entities/governance';
import { formatBalance } from '@shared/lib/utils';
import { FootnoteText, Icon } from '@shared/ui';
import { useI18n } from '@app/providers';
import { Asset } from '@shared/core';
import { VotingStatusBadge } from '../VotingStatusBadge';
import { AggregatedReferendum } from '../../types/structs';

type Props = {
  referendum: AggregatedReferendum;
  asset: Asset | null;
};

export const VotingStatus = ({ referendum, asset }: Props) => {
  const { t } = useI18n();

  const isPassing = referendum.supportThreshold?.passing ?? false;

  const votedFractions =
    referendumService.isOngoing(referendum.referendum) && referendum.approvalThreshold
      ? votingService.getVoteFractions(referendum.referendum.tally, referendum.approvalThreshold.value)
      : null;
  const votedCount =
    referendumService.isOngoing(referendum.referendum) && referendum.supportThreshold
      ? votingService.getVotedCount(referendum.referendum.tally, referendum.supportThreshold.value)
      : null;

  return (
    <div className="flex flex-col items-start gap-6">
      <VotingStatusBadge passing={isPassing} referendum={referendum.referendum} />
      {votedFractions && <VoteChart bgColor="icon-button" descriptionPosition="bottom" {...votedFractions} />}
      {votedCount && (
        <div className="flex items-center gap-1 justify-between flex-wrap w-full">
          <div className="flex items-center gap-1">
            <Icon name="checkmarkOutline" size={18} className="text-icon-positive" />
            <FootnoteText className="text-text-secondary">{t('governance.referendum.threshold')}</FootnoteText>
          </div>
          <FootnoteText>
            {t('governance.referendum.votedTokens', {
              voted: formatBalance(votedCount.voted.toString()).value,
              total: formatBalance(votedCount.of.toString()).value,
              asset: asset?.symbol,
            })}
          </FootnoteText>
        </div>
      )}
    </div>
  );
};
