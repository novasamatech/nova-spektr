import { useI18n } from '@app/providers';
import { type AccountVote, type Asset, type Chain, type OngoingReferendum, type Wallet } from '@shared/core';
import { nonNullable, nullable } from '@shared/lib/utils';
import { Button, FootnoteText } from '@shared/ui';
import { VoteChart, referendumService, votingService } from '@entities/governance';
import { EmptyAccountMessage } from '@/features/emptyList';
import { type AggregatedReferendum } from '../../types/structs';
import { VotingStatusBadge } from '../VotingStatusBadge';

import { Threshold } from './Threshold';

export type VoteRequestParams = { referendum: OngoingReferendum; chain: Chain; asset: Asset };
export type RemoveVoteRequestParams = { referendum: OngoingReferendum; vote: AccountVote; chain: Chain; asset: Asset };

type Props = {
  referendum: AggregatedReferendum;
  chain: Chain;
  asset: Asset | null;
  canVote: boolean;
  wallet?: Wallet;
  hasAccount: boolean;
  onVoteRequest: (params: VoteRequestParams) => unknown;
  onRemoveVoteRequest: (params: RemoveVoteRequestParams) => unknown;
};

export const VotingStatus = ({
  referendum,
  asset,
  chain,
  canVote,
  wallet,
  hasAccount,
  onVoteRequest,
  onRemoveVoteRequest,
}: Props) => {
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

  return (
    <div className="flex flex-col items-start gap-6">
      <VotingStatusBadge passing={isPassing} referendum={referendum} />
      {votedFractions && <VoteChart descriptionPosition="bottom" {...votedFractions} />}
      {votedCount && <Threshold voited={votedCount.voted} threshold={votedCount.threshold} asset={asset} />}

      {canVote && nonNullable(asset) && nullable(referendum.vote) && referendumService.isOngoing(referendum) && (
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

      {canVote && nonNullable(asset) && nonNullable(referendum.vote) && referendumService.isOngoing(referendum) && (
        <div className="flex w-full flex-col justify-stretch gap-4">
          {/*<Button className="w-full">{t('governance.referendum.revote')}</Button>*/}

          <Button
            className="w-full"
            pallet="secondary"
            onClick={() => {
              if (referendum.vote) {
                onRemoveVoteRequest({
                  asset,
                  chain,
                  referendum,
                  vote: referendum.vote,
                });
              }
            }}
          >
            {t('governance.referendum.remove')}
          </Button>
        </div>
      )}
    </div>
  );
};
