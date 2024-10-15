import { type ApiPromise } from '@polkadot/api';

import { type Asset, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { Button, FootnoteText } from '@/shared/ui';
import { ReferendumVoteChart, referendumService, votingService } from '@/entities/governance';
import { EmptyAccountMessage } from '@/features/emptyList';
import { type AggregatedReferendum } from '../../types/structs';
import { ReferendumEndTimer } from '../ReferendumEndTimer/ReferendumEndTimer';
import { VotingStatusBadge } from '../VotingStatusBadge';

import { Threshold } from './Threshold';

type Props = {
  api: ApiPromise;
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
  api,
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

  const { approvalThreshold, supportThreshold, voting } = referendum;

  const isPassing = supportThreshold?.passing ?? false;

  const votedFractions =
    referendumService.isOngoing(referendum) && approvalThreshold
      ? votingService.getVoteFractions(referendum.tally, approvalThreshold.value)
      : null;
  const votedCount =
    referendumService.isOngoing(referendum) && supportThreshold
      ? votingService.getVotedCount(referendum.tally, supportThreshold.value)
      : null;

  const shouldShowVotingButtons = canVote && referendumService.isOngoing(referendum) && nonNullable(asset);

  return (
    <div className="flex flex-col items-start gap-6">
      <div className="flex w-full justify-between">
        <VotingStatusBadge passing={isPassing} referendum={referendum} />

        <ReferendumEndTimer status={referendum.status} endBlock={referendum.end} api={api} />
      </div>
      {votedFractions && (
        <ReferendumVoteChart
          descriptionPosition="bottom"
          aye={votedFractions.aye}
          nay={votedFractions.nay}
          pass={votedFractions.pass}
        />
      )}
      {votedCount && <Threshold voited={votedCount.voted} threshold={votedCount.threshold} asset={asset} />}

      {shouldShowVotingButtons && voting.votes.length < voting.of && (
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

      {shouldShowVotingButtons && voting.votes.length > 0 && (
        <div className="flex w-full flex-col justify-stretch gap-4">
          <Button className="w-full" disabled={!hasAccount || !canVote} onClick={onRevoteRequest}>
            {t('governance.referendum.revote')}
          </Button>

          <Button className="w-full" pallet="secondary" onClick={onRemoveVoteRequest}>
            {t('governance.referendum.remove')}
          </Button>
        </div>
      )}
    </div>
  );
};
