import { useI18n } from '@app/providers';
import { type Asset, type Chain, type OngoingReferendum, type Wallet } from '@shared/core';
import { formatBalance } from '@shared/lib/utils';
import { Button, FootnoteText, Icon } from '@shared/ui';
import { walletUtils } from '@/entities/wallet';
import { VoteChart, referendumService, votingService } from '@entities/governance';
import { EmptyAccountMessage } from '@/features/emptyList';
import { type AggregatedReferendum } from '../../types/structs';
import { VotingStatusBadge } from '../VotingStatusBadge';

export type VoteRequestParams = { referendum: OngoingReferendum; chain: Chain; asset: Asset };

type Props = {
  referendum: AggregatedReferendum;
  chain: Chain;
  asset: Asset | null;
  canVote: boolean;
  wallet?: Wallet;
  hasAccount: boolean;
  onVoteRequest: (params: VoteRequestParams) => unknown;
};

export const VotingStatus = ({ referendum, asset, chain, canVote, wallet, hasAccount, onVoteRequest }: Props) => {
  const { t } = useI18n();

  const { approvalThreshold, supportThreshold } = referendum;

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
  const supportThresholdBalance = votedCount ? formatBalance(votedCount.threshold, asset.precision, { K: true }) : null;

  return (
    <div className="flex flex-col items-start gap-6">
      <VotingStatusBadge passing={isPassing} referendum={referendum} />
      {votedFractions && <VoteChart bgColor="icon-button" descriptionPosition="bottom" {...votedFractions} />}
      {votedBalance && supportThresholdBalance && (
        <div className="flex w-full flex-wrap items-center gap-1.5">
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

      {!walletUtils.isWatchOnly(wallet) &&
        referendumService.isOngoing(referendum) &&
        !!asset &&
        !referendum.isVoted && (
          <div className="flex w-full flex-col gap-4">
            <Button
              className="w-full"
              disabled={!hasAccount || !canVote}
              onClick={() => onVoteRequest({ referendum, asset, chain })}
            >
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

      {canVote && referendumService.isOngoing(referendum) && !!asset && referendum.isVoted && (
        <div className="flex w-full flex-col justify-stretch gap-4">
          <Button className="w-full">{t('governance.referendum.revote')}</Button>

          <Button className="w-full" pallet="secondary">
            {t('governance.referendum.retract')}
          </Button>
        </div>
      )}
    </div>
  );
};
