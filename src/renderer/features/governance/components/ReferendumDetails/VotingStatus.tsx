import { useI18n } from '@app/providers';
import { type Asset, type Wallet } from '@shared/core';
import { nonNullable, nullable } from '@shared/lib/utils';
import { Button, FootnoteText } from '@shared/ui';
import { VoteChart, referendumService, votingService } from '@entities/governance';
import { EmptyAccountMessage } from '@/features/emptyList';
import { type AggregatedReferendum } from '../../types/structs';
import { VotingStatusBadge } from '../VotingStatusBadge';

import { Threshold } from './Threshold';

type Props = {
  referendum: AggregatedReferendum;
  asset: Asset;
  canVote: boolean;
  wallet?: Wallet;
  hasAccount: boolean;
  onVoteRequest: () => unknown;
  onRevoteRequest: () => unknown;
  onRemoveVoteRequest: () => unknown;
};

export const VotingStatus = ({
  referendum,
  asset,
  canVote,
  wallet,
  hasAccount,
  onVoteRequest,
  onRevoteRequest,
  onRemoveVoteRequest,
}: Props) => {
  const { t } = useI18n();

  const { approvalThreshold, supportThreshold, vote } = referendum;

  const isPassing = supportThreshold?.passing ?? false;

  const votedFractions =
    referendumService.isOngoing(referendum) && approvalThreshold
      ? votingService.getVoteFractions(referendum.tally, approvalThreshold.value)
      : null;
  const votedCount =
    referendumService.isOngoing(referendum) && supportThreshold
      ? votingService.getVotedCount(referendum.tally, supportThreshold.value)
      : null;

  return (
    <div className="flex flex-col items-start gap-6">
      <VotingStatusBadge passing={isPassing} referendum={referendum} />
      {votedFractions && (
        <VoteChart
          descriptionPosition="bottom"
          aye={votedFractions.aye}
          nay={votedFractions.nay}
          pass={votedFractions.pass}
        />
      )}
      {votedCount && <Threshold voited={votedCount.voted} threshold={votedCount.threshold} asset={asset} />}

      {canVote && referendumService.isOngoing(referendum) && nonNullable(asset) && nullable(vote) && (
        <div className="flex w-full flex-col gap-4">
          <Button className="w-full" disabled={!hasAccount || !canVote} onClick={onVoteRequest}>
            {t('governance.referendum.vote')}
          </Button>

          {!hasAccount && wallet && (
            <FootnoteText align="center">
              <EmptyAccountMessage walletType={wallet.type} />
            </FootnoteText>
          )}

          {hasAccount && !canVote && (
            <FootnoteText align="center">
              {t('emptyState.accountDescription')} {t('governance.referendum.proxyRestrictionMessage')}
            </FootnoteText>
          )}
        </div>
      )}

      {canVote && nonNullable(asset) && nonNullable(vote) && referendumService.isOngoing(referendum) && (
        <Button className="w-full" disabled={!hasAccount || !canVote} onClick={onRevoteRequest}>
          {t('governance.referendum.revote')}
        </Button>
      )}

      {canVote && nonNullable(asset) && nonNullable(referendum.vote) && referendumService.isOngoing(referendum) && (
        <div className="flex w-full flex-col justify-stretch gap-4">
          {/*<Button className="w-full">{t('governance.referendum.revote')}</Button>*/}

          <Button className="w-full" pallet="secondary" onClick={onRemoveVoteRequest}>
            {t('governance.referendum.remove')}
          </Button>
        </div>
      )}
    </div>
  );
};
